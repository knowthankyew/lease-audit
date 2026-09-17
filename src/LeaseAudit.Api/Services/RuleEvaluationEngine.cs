using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;
using LeaseAudit.Api.Models;

namespace LeaseAudit.Api.Services;

public class RuleEvaluationEngine
{
    private readonly string _dataDirectory;
    private readonly ConcurrentDictionary<string, JurisdictionRules> _rulesCache = new();
    private static readonly TimeSpan DefaultRegexTimeout = TimeSpan.FromMilliseconds(250);
    private readonly ConcurrentDictionary<string, Regex?> _compiledRegexCache = new();

    public RuleEvaluationEngine(string? dataDirectory = null)
    {
        _dataDirectory = dataDirectory ?? Path.Combine(AppContext.BaseDirectory, "Data");
    }

    private Regex? GetOrCreateRegex(string pattern)
    {
        if (string.IsNullOrWhiteSpace(pattern))
            return null;

        return _compiledRegexCache.GetOrAdd(pattern, p =>
        {
            try
            {
                return new Regex(p, RegexOptions.IgnoreCase | RegexOptions.Compiled, DefaultRegexTimeout);
            }
            catch
            {
                return null;
            }
        });
    }

    public JurisdictionRules? GetJurisdictionRules(string jurisdiction)
    {
        var key = jurisdiction.ToUpperInvariant();
        if (_rulesCache.TryGetValue(key, out var cached))
            return cached;

        var path = key == "FED"
            ? Path.Combine(_dataDirectory, "federal.json")
            : Path.Combine(_dataDirectory, "states", $"{key}.json");

        if (!File.Exists(path))
        {
            // Try relative path from project root if running under test or dev
            path = key == "FED"
                ? Path.Combine("src", "LeaseAudit.Api", "Data", "federal.json")
                : Path.Combine("src", "LeaseAudit.Api", "Data", "states", $"{key}.json");
        }

        if (!File.Exists(path))
            return null;

        try
        {
            var json = File.ReadAllText(path);
            var parsed = JsonSerializer.Deserialize<JurisdictionRules>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (parsed != null)
            {
                _rulesCache[key] = parsed;
                return parsed;
            }
        }
        catch
        {
            // Fallback
        }

        return null;
    }

    public AuditResult Evaluate(List<Clause> clauses, string stateCode)
    {
        var stateKey = (stateCode ?? "FED").Trim().ToUpperInvariant();
        var stateRules = stateKey != "FED" ? GetJurisdictionRules(stateKey) : null;
        var federalRules = GetJurisdictionRules("FED");

        var allRules = new List<RuleItem>();
        if (stateRules != null)
            allRules.AddRange(stateRules.Rules);
        if (federalRules != null)
            allRules.AddRange(federalRules.Rules);

        var jurisdictionName = stateRules?.JurisdictionName ?? federalRules?.JurisdictionName ?? stateKey;

        foreach (var clause in clauses)
        {
            EvaluateClause(clause, allRules);
        }

        var standard = clauses.Count(c => c.Status == ClauseSeverity.Standard);
        var watch = clauses.Count(c => c.Status == ClauseSeverity.Watch);
        var unenforceable = clauses.Count(c => c.Status == ClauseSeverity.LikelyUnenforceable);

        string riskLevel = "Low";
        if (unenforceable >= 2)
            riskLevel = "High";
        else if (unenforceable == 1 || watch >= 2)
            riskLevel = "Moderate";

        return new AuditResult
        {
            Jurisdiction = stateKey,
            JurisdictionName = jurisdictionName,
            Summary = new AuditSummary
            {
                TotalClauses = clauses.Count,
                StandardCount = standard,
                WatchCount = watch,
                UnenforceableCount = unenforceable,
                RiskLevel = riskLevel
            },
            Clauses = clauses
        };
    }

    private void EvaluateClause(Clause clause, List<RuleItem> rules)
    {
        var matchedRules = new List<RuleItem>();

        foreach (var rule in rules)
        {
            bool isTriggered = false;
            foreach (var pattern in rule.TriggerPatterns)
            {
                var regex = GetOrCreateRegex(pattern);
                if (regex == null)
                    continue;

                try
                {
                    if (regex.IsMatch(clause.RawText))
                    {
                        isTriggered = true;
                        break;
                    }
                }
                catch (RegexMatchTimeoutException)
                {
                    // ReDoS safeguard: safely bypass timed-out evaluation
                }
            }

            if (!isTriggered)
                continue;

            // Check contra-indicators
            bool contraIndicated = false;
            foreach (var contra in rule.ContraIndicatorPatterns)
            {
                var contraRegex = GetOrCreateRegex(contra);
                if (contraRegex == null)
                    continue;

                try
                {
                    if (contraRegex.IsMatch(clause.RawText))
                    {
                        contraIndicated = true;
                        break;
                    }
                }
                catch (RegexMatchTimeoutException)
                {
                    // Ignore on timeout
                }
            }

            if (contraIndicated)
                continue;

            matchedRules.Add(rule);
        }

        if (matchedRules.Count > 0)
        {
            // Highest severity sets clause status
            var maxSeverity = matchedRules.Max(r => r.Severity);
            clause.Status = maxSeverity;

            // Collect rules that match the maximum severity
            var topRules = matchedRules.Where(r => r.Severity == maxSeverity).ToList();

            clause.MatchedRuleId = string.Join(", ", topRules.Select(r => r.Id).Distinct());
            clause.StatuteCitation = string.Join("; ", topRules.Select(r => r.StatuteCitation).Distinct());
            clause.StatuteSummary = string.Join(" ", topRules.Select(r => r.StatuteSummary).Distinct());
            clause.OfficialSourceUrl = topRules.First().OfficialUrl;
            clause.Explanation = string.Join(" ", topRules.Select(r => r.StatuteSummary).Distinct());

            var clauseIdentifier = clause.SectionNumber ?? clause.Id;
            var recommendations = topRules
                .Select(r => r.DisputeTemplate.Replace("{clauseNumber}", clauseIdentifier))
                .Distinct();
            clause.DisputeRecommendation = string.Join(" ", recommendations);

            // If the clause was generic, adopt the category of the matched rule
            if (clause.Category == ClauseCategory.General && topRules.Any(r => r.Category != ClauseCategory.General))
            {
                clause.Category = topRules.First(r => r.Category != ClauseCategory.General).Category;
            }
        }
    }
}
