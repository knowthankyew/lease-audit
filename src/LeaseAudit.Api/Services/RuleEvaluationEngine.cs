using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;
using LeaseAudit.Api.Models;

namespace LeaseAudit.Api.Services;

public class RuleEvaluationEngine
{
    private readonly string _dataDirectory;
    private readonly ConcurrentDictionary<string, JurisdictionRules> _rulesCache = new();

    public RuleEvaluationEngine(string? dataDirectory = null)
    {
        _dataDirectory = dataDirectory ?? Path.Combine(AppContext.BaseDirectory, "Data");
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
            // Log or fallback
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

    private static void EvaluateClause(Clause clause, List<RuleItem> rules)
    {
        RuleItem? bestMatch = null;

        foreach (var rule in rules)
        {
            // Category match or General
            bool categoryRelevant = rule.Category == ClauseCategory.General || 
                                    clause.Category == ClauseCategory.General || 
                                    rule.Category == clause.Category;

            if (!categoryRelevant)
                continue;

            bool isTriggered = false;
            foreach (var pattern in rule.TriggerPatterns)
            {
                try
                {
                    if (Regex.IsMatch(clause.RawText, pattern, RegexOptions.IgnoreCase))
                    {
                        isTriggered = true;
                        break;
                    }
                }
                catch
                {
                    // Ignore regex syntax issue in rule
                }
            }

            if (!isTriggered)
                continue;

            // Check contra-indicators
            bool contraIndicated = false;
            foreach (var contra in rule.ContraIndicatorPatterns)
            {
                try
                {
                    if (Regex.IsMatch(clause.RawText, contra, RegexOptions.IgnoreCase))
                    {
                        contraIndicated = true;
                        break;
                    }
                }
                catch
                {
                    // Ignore
                }
            }

            if (contraIndicated)
                continue;

            // Determine if this match is higher priority than existing match
            if (bestMatch == null || rule.Severity > bestMatch.Severity)
            {
                bestMatch = rule;
            }
        }

        if (bestMatch != null)
        {
            clause.Status = bestMatch.Severity;
            clause.MatchedRuleId = bestMatch.Id;
            clause.StatuteCitation = bestMatch.StatuteCitation;
            clause.StatuteSummary = bestMatch.StatuteSummary;
            clause.OfficialSourceUrl = bestMatch.OfficialUrl;
            clause.Explanation = bestMatch.StatuteSummary;

            var disputeText = bestMatch.DisputeTemplate
                .Replace("{clauseNumber}", clause.SectionNumber ?? clause.Id);
            clause.DisputeRecommendation = disputeText;
        }
    }
}
