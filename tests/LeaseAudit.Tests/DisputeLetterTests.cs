using LeaseAudit.Api.Models;
using LeaseAudit.Api.Services;

namespace LeaseAudit.Tests;

public class DisputeLetterTests
{
    private readonly DisputeLetterService _service = new();

    [Fact]
    public void GenerateLetter_PreSigning_IncludesStatutoryCitationsAndRemedies()
    {
        var request = new DisputeRequest
        {
            Jurisdiction = "CA",
            TenantName = "Alex Morgan",
            LandlordName = "Apex Residential LLC",
            PropertyAddress = "500 Howard St, Apt 2B, San Francisco, CA",
            LetterType = LetterType.PreSigning,
            FlaggedClauses = new List<Clause>
            {
                new Clause
                {
                    Id = "clause-03",
                    SectionNumber = "3",
                    Title = "Security Deposit Terms",
                    RawText = "Deposit shall be $6,000.00 (two months rent).",
                    Status = ClauseSeverity.LikelyUnenforceable,
                    StatuteCitation = "Cal. Civ. Code § 1950.5(c)",
                    Explanation = "California caps deposits at 1 month rent.",
                    DisputeRecommendation = "Reduce deposit to one month rent."
                }
            }
        };

        var result = _service.GenerateLetter(request);

        Assert.NotNull(result);
        Assert.Contains("Alex Morgan", result.LetterPlaintext);
        Assert.Contains("Apex Residential LLC", result.LetterPlaintext);
        Assert.Contains("Cal. Civ. Code § 1950.5(c)", result.LetterPlaintext);
        Assert.Contains("Reduce deposit to one month rent.", result.LetterPlaintext);
        Assert.Contains("Cal. Civ. Code § 1950.5(c)", result.StatutesCited);
        Assert.Contains("Proposed Lease Provisions", result.LetterPlaintext);
    }

    [Fact]
    public void GenerateLetter_TenancyDispute_FormatsNoticeOfUnenforceability()
    {
        var request = new DisputeRequest
        {
            Jurisdiction = "NY",
            TenantName = "Jordan Lee",
            LandlordName = "Midtown Towers LLC",
            PropertyAddress = "200 E 34th St, New York, NY",
            LetterType = LetterType.TenancyDispute,
            FlaggedClauses = new List<Clause>
            {
                new Clause
                {
                    Id = "clause-04",
                    SectionNumber = "4",
                    Title = "Late Fees",
                    RawText = "Late fee of $200 assessed on 2nd day.",
                    Status = ClauseSeverity.LikelyUnenforceable,
                    StatuteCitation = "N.Y. Real Prop. Law § 238-a(2)",
                    Explanation = "Late fee cannot exceed $50 or 5% after 5 days.",
                    DisputeRecommendation = "Strike fee beyond $50 limit."
                }
            }
        };

        var result = _service.GenerateLetter(request);

        Assert.NotNull(result);
        Assert.Contains("Jordan Lee", result.LetterPlaintext);
        Assert.Contains("N.Y. Real Prop. Law § 238-a(2)", result.LetterPlaintext);
        Assert.Contains("Formal Notice of Unenforceable Lease Provision(s)", result.LetterPlaintext);
    }
}
