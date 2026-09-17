using System.Text.RegularExpressions;
using LeaseAudit.Api.Services;

namespace LeaseAudit.Tests;

public class StatuteVerificationTests
{
    private static readonly string[] RequiredJurisdictions = { "FED", "CA", "NY", "TX", "FL", "IL" };
    private readonly RuleEvaluationEngine _engine = new();

    [Theory]
    [InlineData("FED")]
    [InlineData("CA")]
    [InlineData("NY")]
    [InlineData("TX")]
    [InlineData("FL")]
    [InlineData("IL")]
    public void StatuteData_ExistsAndHasValidRules(string jurisdiction)
    {
        var data = _engine.GetJurisdictionRules(jurisdiction);
        Assert.NotNull(data);
        Assert.Equal(jurisdiction, data.Jurisdiction, ignoreCase: true);
        Assert.NotEmpty(data.JurisdictionName);
        Assert.NotEmpty(data.Rules);

        foreach (var rule in data.Rules)
        {
            // 1. Id is well-formed
            Assert.False(string.IsNullOrWhiteSpace(rule.Id), "Rule must have a non-empty Id");
            Assert.StartsWith(jurisdiction + "-", rule.Id);

            // 2. Statute citation is present and conforms to statutory formatting
            Assert.False(string.IsNullOrWhiteSpace(rule.StatuteCitation), $"Rule {rule.Id} missing statute citation");
            Assert.True(
                Regex.IsMatch(rule.StatuteCitation, @"(?:§|ILCS|U\.S\.C\.|Stat\.|Code|Gen\.\s*Oblig\.|Real\s*Prop\.)"),
                $"Rule {rule.Id} statute citation '{rule.StatuteCitation}' does not contain recognized legal citation markers"
            );

            // 3. Summary and official URL
            Assert.False(string.IsNullOrWhiteSpace(rule.StatuteSummary), $"Rule {rule.Id} missing statute summary");
            Assert.StartsWith("http", rule.OfficialUrl);

            // 4. Trigger patterns exist and compile
            Assert.NotEmpty(rule.TriggerPatterns);
            foreach (var pattern in rule.TriggerPatterns)
            {
                var regex = new Regex(pattern); // Will throw ArgumentException if invalid regex
                Assert.NotNull(regex);
            }

            // 5. Dispute template exists
            Assert.False(string.IsNullOrWhiteSpace(rule.DisputeTemplate), $"Rule {rule.Id} missing dispute template");
        }
    }
}
