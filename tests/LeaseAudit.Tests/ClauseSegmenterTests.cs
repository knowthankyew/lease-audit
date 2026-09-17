using LeaseAudit.Api.Models;
using LeaseAudit.Api.Services;

namespace LeaseAudit.Tests;

public class ClauseSegmenterTests
{
    private readonly ClauseSegmenter _segmenter = new();

    [Fact]
    public void Segment_CaliforniaLease_ExtractsExpectedClausesAndCategories()
    {
        var leasePath = Path.Combine(AppContext.BaseDirectory, "Samples", "sample_ca_lease.txt");
        if (!File.Exists(leasePath))
        {
            // Try relative path from test project root
            leasePath = Path.Combine("Samples", "sample_ca_lease.txt");
        }

        var text = File.ReadAllText(leasePath);
        var clauses = _segmenter.Segment(text);

        Assert.NotEmpty(clauses);
        Assert.True(clauses.Count >= 7, $"Expected at least 7 clauses, found {clauses.Count}");

        // Check for specific categories
        Assert.Contains(clauses, c => c.Category == ClauseCategory.SecurityDeposit);
        Assert.Contains(clauses, c => c.Category == ClauseCategory.LateFees);
        Assert.Contains(clauses, c => c.Category == ClauseCategory.EntryNotice);
        Assert.Contains(clauses, c => c.Category == ClauseCategory.HabitabilityRepairs);
        Assert.Contains(clauses, c => c.Category == ClauseCategory.EvictionLockout);
    }

    [Fact]
    public void Segment_NewYorkLease_IdentifiesNumberedHeaders()
    {
        var leasePath = Path.Combine(AppContext.BaseDirectory, "Samples", "sample_ny_lease.txt");
        if (!File.Exists(leasePath))
        {
            leasePath = Path.Combine("Samples", "sample_ny_lease.txt");
        }

        var text = File.ReadAllText(leasePath);
        var clauses = _segmenter.Segment(text);

        Assert.NotEmpty(clauses);
        Assert.True(clauses.Count >= 6, $"Expected at least 6 clauses, found {clauses.Count}");

        var depositClause = clauses.FirstOrDefault(c => c.Category == ClauseCategory.SecurityDeposit);
        Assert.NotNull(depositClause);
        Assert.Contains("6,400", depositClause.RawText);
    }

    [Fact]
    public void Segment_EmptyOrWhitespace_ReturnsEmptyList()
    {
        Assert.Empty(_segmenter.Segment(""));
        Assert.Empty(_segmenter.Segment("   \n\n\t  "));
    }

    [Fact]
    public void NormalizeText_CleansSmartQuotesAndExcessiveBreaks()
    {
        var messy = "“Smart quotes” and ‘single’ and \r\n\r\n\r\n\r\nfour breaks";
        var cleaned = DocumentExtractor.NormalizeText(messy);

        Assert.Contains("\"Smart quotes\"", cleaned);
        Assert.Contains("'single'", cleaned);
        Assert.DoesNotContain("\r", cleaned);
        Assert.DoesNotContain("\n\n\n", cleaned);
    }
}
