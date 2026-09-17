using System.Text.RegularExpressions;
using LeaseAudit.Api.Models;

namespace LeaseAudit.Api.Services;

public class ClauseSegmenter
{
    private static readonly Regex SectionHeaderRegex = new(
        @"^(?:(?:SECTION|ARTICLE|PARAGRAPH|CLAUSE)\s+([0-9IVXLCDM]+(?:\.[0-9]+)*)[:.]?\s*(.*?)$|([0-9]+(?:\.[0-9]+)*)[\.\)]\s+([A-Z][A-Za-z0-9\s,\-\/]{2,40})[:\.\-]?\s*$|^([A-Z\s]{4,35}):\s*$)",
        RegexOptions.Multiline | RegexOptions.IgnoreCase | RegexOptions.Compiled
    );

    // Eviction and lockout keywords evaluated before general entry/termination to avoid collision with 're-enter'
    private static readonly (ClauseCategory Category, string[] Keywords)[] CategoryKeywords = new[]
    {
        (ClauseCategory.EvictionLockout, new[] { 
            "self-help", "re-entry", "re-enter", "lockout", "padlock", "pad-lock", 
            "change door locks", "change locks", "shut off utilities", "terminate utility", 
            "remove tenant's belongings", "remove and dispose of tenant", "waiver of notice to quit", 
            "summary eviction" 
        }),
        (ClauseCategory.SecurityDeposit, new[] { 
            "security deposit", "damage deposit", "deposit refund", "deductions from deposit", 
            "deposit return", "holding deposit", "escrow", "normal wear and tear", 
            "return of deposit", "deposit upon signing" 
        }),
        (ClauseCategory.LateFees, new[] { 
            "late fee", "late charge", "grace period", "late payment", "returned check fee", 
            "nsf fee", "bounced check", "penalty for late" 
        }),
        (ClauseCategory.EntryNotice, new[] { 
            "right of entry", "notice of entry", "entry by landlord", "access to premises", 
            "access to apartment", "landlord access", "landlord entry", "notice to enter", 
            "reasonable notice of entry", "inspection", "24 hours notice", "24-hour notice", 
            "12 hours notice", "reasonable notice" 
        }),
        (ClauseCategory.HabitabilityRepairs, new[] { 
            "habitability", "maintenance and repair", "repairs", "maintenance", "condition of premises", 
            "as-is", "as is condition", "tenant agrees to repair", "pest control", "air conditioning", 
            "heating", "mold", "plumbing clogs", "roof leaks", "warranty of habitability" 
        }),
        (ClauseCategory.TerminationRenewal, new[] { 
            "termination", "renewal", "non-renewal", "notice to vacate", "month-to-month", 
            "surrender", "military transfer", "active duty", "scra", "early termination", "lease term" 
        }),
        (ClauseCategory.Disclosures, new[] { 
            "lead-based paint", "lead paint", "bedbug", "bed bugs", "radon", "flood zone", 
            "sex offender registry", "megan's law", "asbestos", "mold disclosure" 
        })
    };

    public List<Clause> Segment(string normalizedText)
    {
        var clauses = new List<Clause>();
        if (string.IsNullOrWhiteSpace(normalizedText))
            return clauses;

        var lines = normalizedText.Split('\n');
        var currentSectionNumber = string.Empty;
        var currentTitle = string.Empty;
        var currentBodyLines = new List<string>();
        var clauseIndex = 1;

        void FlushCurrentClause()
        {
            var body = string.Join("\n", currentBodyLines).Trim();
            if (!string.IsNullOrWhiteSpace(body) && body.Length >= 15)
            {
                var combined = (currentTitle + " " + body).Trim();
                var category = DetectCategory(combined);
                clauses.Add(new Clause
                {
                    Id = $"clause-{clauseIndex:D2}",
                    SectionNumber = string.IsNullOrWhiteSpace(currentSectionNumber) ? null : currentSectionNumber.Trim(),
                    Title = string.IsNullOrWhiteSpace(currentTitle) ? GenerateDefaultTitle(body, category) : currentTitle.Trim(),
                    RawText = body,
                    Category = category,
                    Status = ClauseSeverity.Standard
                });
                clauseIndex++;
            }
            currentBodyLines.Clear();
        }

        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();

            // Check if line is a section header
            var match = SectionHeaderRegex.Match(line);
            if (match.Success)
            {
                FlushCurrentClause();

                if (!string.IsNullOrEmpty(match.Groups[1].Value))
                {
                    currentSectionNumber = match.Groups[1].Value;
                    currentTitle = match.Groups[2].Value.Trim();
                }
                else if (!string.IsNullOrEmpty(match.Groups[3].Value))
                {
                    currentSectionNumber = match.Groups[3].Value;
                    currentTitle = match.Groups[4].Value.Trim();
                }
                else if (!string.IsNullOrEmpty(match.Groups[5].Value))
                {
                    currentSectionNumber = string.Empty;
                    currentTitle = match.Groups[5].Value.Trim();
                }
                continue;
            }

            if (string.IsNullOrWhiteSpace(line))
            {
                if (currentBodyLines.Count > 0)
                {
                    var accumulatedText = string.Join(" ", currentBodyLines);
                    if (string.IsNullOrWhiteSpace(currentSectionNumber) && accumulatedText.Length > 100)
                    {
                        FlushCurrentClause();
                        currentTitle = string.Empty;
                    }
                }
                continue;
            }

            currentBodyLines.Add(line);
        }

        FlushCurrentClause();

        if (clauses.Count == 0 && !string.IsNullOrWhiteSpace(normalizedText))
        {
            var paragraphs = normalizedText.Split(new[] { "\n\n" }, StringSplitOptions.RemoveEmptyEntries);
            int idx = 1;
            foreach (var para in paragraphs)
            {
                var trimmed = para.Trim();
                if (trimmed.Length >= 15)
                {
                    var category = DetectCategory(trimmed);
                    clauses.Add(new Clause
                    {
                        Id = $"clause-{idx:D2}",
                        Title = GenerateDefaultTitle(trimmed, category),
                        RawText = trimmed,
                        Category = category,
                        Status = ClauseSeverity.Standard
                    });
                    idx++;
                }
            }
        }

        return clauses;
    }

    public static ClauseCategory DetectCategory(string text)
    {
        var lower = text.ToLowerInvariant();

        foreach (var (category, keywords) in CategoryKeywords)
        {
            foreach (var kw in keywords)
            {
                if (lower.Contains(kw))
                    return category;
            }
        }

        return ClauseCategory.General;
    }

    private static string GenerateDefaultTitle(string body, ClauseCategory category)
    {
        if (category != ClauseCategory.General)
        {
            return category switch
            {
                ClauseCategory.SecurityDeposit => "Security Deposit Terms",
                ClauseCategory.LateFees => "Late Fees and Charges",
                ClauseCategory.EntryNotice => "Landlord Access & Notice to Enter",
                ClauseCategory.HabitabilityRepairs => "Repairs and Habitability",
                ClauseCategory.EvictionLockout => "Default & Eviction Terms",
                ClauseCategory.TerminationRenewal => "Termination and Renewal",
                ClauseCategory.Disclosures => "Required Disclosures",
                _ => "General Provision"
            };
        }

        var firstSentence = body.Split('.', '\n')[0].Trim();
        if (firstSentence.Length > 40)
            return firstSentence.Substring(0, 37) + "...";
        return firstSentence.Length > 0 ? firstSentence : "General Provision";
    }
}
