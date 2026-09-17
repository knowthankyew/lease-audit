using System.Text.Json.Serialization;

namespace LeaseAudit.Api.Models;

public class Clause
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("sectionNumber")]
    public string? SectionNumber { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("rawText")]
    public string RawText { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public ClauseCategory Category { get; set; } = ClauseCategory.General;

    [JsonPropertyName("status")]
    public ClauseSeverity Status { get; set; } = ClauseSeverity.Standard;

    [JsonPropertyName("matchedRuleId")]
    public string? MatchedRuleId { get; set; }

    [JsonPropertyName("statuteCitation")]
    public string? StatuteCitation { get; set; }

    [JsonPropertyName("statuteSummary")]
    public string? StatuteSummary { get; set; }

    [JsonPropertyName("officialSourceUrl")]
    public string? OfficialSourceUrl { get; set; }

    [JsonPropertyName("explanation")]
    public string? Explanation { get; set; }

    [JsonPropertyName("disputeRecommendation")]
    public string? DisputeRecommendation { get; set; }
}
