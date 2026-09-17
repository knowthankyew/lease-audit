using LeaseAudit.Api.Models;
using LeaseAudit.Api.Services;

namespace LeaseAudit.Tests;

public class RuleEngineTests
{
    private readonly ClauseSegmenter _segmenter = new();
    private readonly RuleEvaluationEngine _engine = new();

    [Fact]
    public void Evaluate_CaliforniaLease_CorrectlyFlagsPredatoryClauses()
    {
        var leasePath = Path.Combine(AppContext.BaseDirectory, "Samples", "sample_ca_lease.txt");
        if (!File.Exists(leasePath))
            leasePath = Path.Combine("Samples", "sample_ca_lease.txt");

        var text = File.ReadAllText(leasePath);
        var clauses = _segmenter.Segment(text);
        var result = _engine.Evaluate(clauses, "CA");

        Assert.Equal("CA", result.Jurisdiction);
        Assert.Equal("High", result.Summary.RiskLevel);
        Assert.True(result.Summary.UnenforceableCount >= 3, $"Expected at least 3 unenforceable clauses, found {result.Summary.UnenforceableCount}");

        // 1. Check Security Deposit: 2 months rent + 60 days return
        var depositClause = result.Clauses.FirstOrDefault(c => c.Category == ClauseCategory.SecurityDeposit);
        Assert.NotNull(depositClause);
        Assert.Equal(ClauseSeverity.LikelyUnenforceable, depositClause.Status);
        Assert.Contains("1950.5", depositClause.StatuteCitation);

        // 2. Check Right of Entry: entry at any time without notice
        var entryClause = result.Clauses.FirstOrDefault(c => c.Category == ClauseCategory.EntryNotice);
        Assert.NotNull(entryClause);
        Assert.Equal(ClauseSeverity.LikelyUnenforceable, entryClause.Status);
        Assert.Contains("1954", entryClause.StatuteCitation);

        // 3. Check Self-Help / Lockout: padlocks, cut off utilities, take possession
        var evictionClause = result.Clauses.FirstOrDefault(c => c.Category == ClauseCategory.EvictionLockout);
        Assert.NotNull(evictionClause);
        Assert.Equal(ClauseSeverity.LikelyUnenforceable, evictionClause.Status);
        Assert.Contains("789.3", evictionClause.StatuteCitation);

        // 4. Check Habitability: as-is waiver
        var habitabilityClause = result.Clauses.FirstOrDefault(c => c.Category == ClauseCategory.HabitabilityRepairs);
        Assert.NotNull(habitabilityClause);
        Assert.Equal(ClauseSeverity.LikelyUnenforceable, habitabilityClause.Status);
        Assert.Contains("1941.1", habitabilityClause.StatuteCitation);
    }

    [Fact]
    public void Evaluate_NewYorkLease_CorrectlyFlagsPredatoryClauses()
    {
        var leasePath = Path.Combine(AppContext.BaseDirectory, "Samples", "sample_ny_lease.txt");
        if (!File.Exists(leasePath))
            leasePath = Path.Combine("Samples", "sample_ny_lease.txt");

        var text = File.ReadAllText(leasePath);
        var clauses = _segmenter.Segment(text);
        var result = _engine.Evaluate(clauses, "NY");

        Assert.Equal("NY", result.Jurisdiction);
        Assert.Equal("High", result.Summary.RiskLevel);

        // Check Security Deposit
        var deposit = result.Clauses.FirstOrDefault(c => c.Category == ClauseCategory.SecurityDeposit);
        Assert.NotNull(deposit);
        Assert.Equal(ClauseSeverity.LikelyUnenforceable, deposit.Status);
        Assert.Contains("7-108", deposit.StatuteCitation);

        // Check Late fee: 15% on 2nd day
        var lateFee = result.Clauses.FirstOrDefault(c => c.Category == ClauseCategory.LateFees);
        Assert.NotNull(lateFee);
        Assert.Equal(ClauseSeverity.LikelyUnenforceable, lateFee.Status);
        Assert.Contains("238-a", lateFee.StatuteCitation);

        // Check Self-help padlocks
        var selfHelp = result.Clauses.FirstOrDefault(c => c.Category == ClauseCategory.EvictionLockout);
        Assert.NotNull(selfHelp);
        Assert.Equal(ClauseSeverity.LikelyUnenforceable, selfHelp.Status);
        Assert.Contains("768", selfHelp.StatuteCitation);
    }

    [Fact]
    public void Evaluate_FederalBaselineOnly_AppliesWhenStateNotSpecified()
    {
        var clause = new Clause
        {
            Id = "clause-01",
            Title = "Occupancy",
            RawText = "No children allowed in the building under any circumstances. Adults only.",
            Category = ClauseCategory.General,
            Status = ClauseSeverity.Standard
        };

        var result = _engine.Evaluate(new List<Clause> { clause }, "FED");
        Assert.Equal("FED", result.Jurisdiction);
        Assert.Equal(ClauseSeverity.LikelyUnenforceable, result.Clauses[0].Status);
        Assert.Contains("3604", result.Clauses[0].StatuteCitation);
    }
}
