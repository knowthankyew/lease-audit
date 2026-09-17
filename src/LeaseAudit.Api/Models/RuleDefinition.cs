using System.Text.Json.Serialization;

namespace LeaseAudit.Api.Models;

public class JurisdictionRules
{
    [JsonPropertyName("jurisdiction")]
    public string Jurisdiction { get; set; } = string.Empty;

    [JsonPropertyName("jurisdictionName")]
    public string JurisdictionName { get; set; } = string.Empty;

    [JsonPropertyName("statuteVersion")]
    public string StatuteVersion { get; set; } = "2026.1";

    [JsonPropertyName("lastAudited")]
    public string LastAudited { get; set; } = string.Empty;

    [JsonPropertyName("officialSourceUrl")]
    public string OfficialSourceUrl { get; set; } = string.Empty;

    [JsonPropertyName("rules")]
    public List<RuleItem> Rules { get; set; } = new();
}

public class RuleItem
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("category")]
    public ClauseCategory Category { get; set; } = ClauseCategory.General;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("severity")]
    public ClauseSeverity Severity { get; set; } = ClauseSeverity.Standard;

    [JsonPropertyName("statuteCitation")]
    public string StatuteCitation { get; set; } = string.Empty;

    [JsonPropertyName("statuteSummary")]
    public string StatuteSummary { get; set; } = string.Empty;

    [JsonPropertyName("officialUrl")]
    public string OfficialUrl { get; set; } = string.Empty;

    [JsonPropertyName("triggerPatterns")]
    public List<string> TriggerPatterns { get; set; } = new();

    [JsonPropertyName("contraIndicatorPatterns")]
    public List<string> ContraIndicatorPatterns { get; set; } = new();

    [JsonPropertyName("disputeTemplate")]
    public string DisputeTemplate { get; set; } = string.Empty;
}
