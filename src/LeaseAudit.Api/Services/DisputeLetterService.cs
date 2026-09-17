using System.Text;
using LeaseAudit.Api.Models;

namespace LeaseAudit.Api.Services;

public class DisputeLetterService
{
    public DisputeResult GenerateLetter(DisputeRequest request)
    {
        var sb = new StringBuilder();
        var plainSb = new StringBuilder();
        var statutes = new HashSet<string>();

        var dateStr = DateTime.Now.ToString("MMMM dd, yyyy");
        var tenantName = string.IsNullOrWhiteSpace(request.TenantName) ? "[Tenant Name]" : request.TenantName.Trim();
        var landlordName = string.IsNullOrWhiteSpace(request.LandlordName) ? "[Landlord / Property Management]" : request.LandlordName.Trim();
        var address = string.IsNullOrWhiteSpace(request.PropertyAddress) ? "[Rental Property Address]" : request.PropertyAddress.Trim();

        // Header
        sb.AppendLine($"**Date:** {dateStr}");
        sb.AppendLine($"**To:** {landlordName}");
        sb.AppendLine($"**From:** {tenantName}");
        sb.AppendLine($"**Regarding:** Lease Agreement for {address}");
        sb.AppendLine();

        plainSb.AppendLine($"Date: {dateStr}");
        plainSb.AppendLine($"To: {landlordName}");
        plainSb.AppendLine($"From: {tenantName}");
        plainSb.AppendLine($"Regarding: Lease Agreement for {address}");
        plainSb.AppendLine();

        if (request.LetterType == LetterType.PreSigning)
        {
            sb.AppendLine("### RE: Proposed Lease Provisions Requiring Statutory Compliance");
            sb.AppendLine();
            sb.AppendLine($"Dear {landlordName},");
            sb.AppendLine();
            sb.AppendLine($"I am currently reviewing the proposed residential lease agreement for the premises at **{address}**. Prior to executing this contract, I have conducted a review of its terms in accordance with governing state and federal landlord-tenant statutes.");
            sb.AppendLine();
            sb.AppendLine("I identified several provisions that appear to conflict with governing statutory requirements or established public policy. To ensure our agreement is lawful, mutually protective, and fully enforceable, I respectfully request that the following clauses be amended or struck before signing:");
            sb.AppendLine();

            plainSb.AppendLine("RE: Proposed Lease Provisions Requiring Statutory Compliance\n");
            plainSb.AppendLine($"Dear {landlordName},\n");
            plainSb.AppendLine($"I am currently reviewing the proposed residential lease agreement for the premises at {address}. Prior to executing this contract, I have conducted a review of its terms in accordance with governing state and federal landlord-tenant statutes.\n");
            plainSb.AppendLine("I identified several provisions that appear to conflict with governing statutory requirements or established public policy. To ensure our agreement is lawful, mutually protective, and fully enforceable, I respectfully request that the following clauses be amended or struck before signing:\n");
        }
        else
        {
            sb.AppendLine("### RE: Formal Notice of Unenforceable Lease Provision(s)");
            sb.AppendLine();
            sb.AppendLine($"Dear {landlordName},");
            sb.AppendLine();
            sb.AppendLine($"I am writing regarding the ongoing tenancy at **{address}**. This letter serves as formal notice that certain provisions within our residential lease agreement conflict with mandatory statutory tenant protections under governing law.");
            sb.AppendLine();
            sb.AppendLine("Please be advised that under governing statutes, private lease contracts cannot waive statutory rights or enforce terms that violate statutory minimums. I request written confirmation that the following provisions will not be enforced and are considered void:");
            sb.AppendLine();

            plainSb.AppendLine("RE: Formal Notice of Unenforceable Lease Provision(s)\n");
            plainSb.AppendLine($"Dear {landlordName},\n");
            plainSb.AppendLine($"I am writing regarding the ongoing tenancy at {address}. This letter serves as formal notice that certain provisions within our residential lease agreement conflict with mandatory statutory tenant protections under governing law.\n");
            plainSb.AppendLine("Please be advised that under governing statutes, private lease contracts cannot waive statutory rights or enforce terms that violate statutory minimums. I request written confirmation that the following provisions will not be enforced and are considered void:\n");
        }

        int itemIndex = 1;
        foreach (var clause in request.FlaggedClauses)
        {
            var citation = clause.StatuteCitation ?? "Governing Landlord-Tenant Statute";
            statutes.Add(citation);

            var title = clause.Title ?? $"Clause {clause.SectionNumber ?? clause.Id}";
            var rawQuote = clause.RawText.Length > 200 
                ? clause.RawText.Substring(0, 197) + "..." 
                : clause.RawText;

            // Markdown
            sb.AppendLine($"#### {itemIndex}. {title} ({citation})");
            sb.AppendLine($"> \"{rawQuote}\"");
            sb.AppendLine();
            if (!string.IsNullOrWhiteSpace(clause.Explanation))
            {
                sb.AppendLine($"*Legal Context:* {clause.Explanation}");
                sb.AppendLine();
            }
            if (!string.IsNullOrWhiteSpace(clause.DisputeRecommendation))
            {
                sb.AppendLine($"**Requested Remedy:** {clause.DisputeRecommendation}");
                sb.AppendLine();
            }

            // Plain text
            plainSb.AppendLine($"{itemIndex}. {title} ({citation})");
            plainSb.AppendLine($"   Quoted provision: \"{rawQuote}\"");
            if (!string.IsNullOrWhiteSpace(clause.Explanation))
            {
                plainSb.AppendLine($"   Legal Context: {clause.Explanation}");
            }
            if (!string.IsNullOrWhiteSpace(clause.DisputeRecommendation))
            {
                plainSb.AppendLine($"   Requested Remedy: {clause.DisputeRecommendation}");
            }
            plainSb.AppendLine();

            itemIndex++;
        }

        // Closing
        sb.AppendLine("### Next Steps");
        sb.AppendLine("I value a transparent, compliant, and professional landlord-tenant relationship and look forward to promptly resolving these items. Please provide your written response or revised lease agreement within five (5) business days of receipt.");
        sb.AppendLine();
        sb.AppendLine("Sincerely,");
        sb.AppendLine();
        sb.AppendLine($"**{tenantName}**  ");
        sb.AppendLine($"*{address}*");

        plainSb.AppendLine("Next Steps");
        plainSb.AppendLine("I value a transparent, compliant, and professional landlord-tenant relationship and look forward to promptly resolving these items. Please provide your written response or revised lease agreement within five (5) business days of receipt.\n");
        plainSb.AppendLine("Sincerely,\n");
        plainSb.AppendLine($"{tenantName}");
        plainSb.AppendLine($"{address}");

        return new DisputeResult
        {
            LetterMarkdown = sb.ToString(),
            LetterPlaintext = plainSb.ToString(),
            StatutesCited = statutes.OrderBy(s => s).ToList()
        };
    }
}
