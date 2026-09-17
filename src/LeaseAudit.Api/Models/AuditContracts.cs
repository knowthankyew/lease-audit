using System.Text.Json.Serialization;

namespace LeaseAudit.Api.Models;

public class AuditRequest
{
    [JsonPropertyName("rawText")]
    public string RawText { get; set; } = string.Empty;

    [JsonPropertyName("jurisdiction")]
    public string Jurisdiction { get; set; } = "FED";
}

public class AuditSummary
{
    [JsonPropertyName("totalClauses")]
    public int TotalClauses { get; set; }

    [JsonPropertyName("standardCount")]
    public int StandardCount { get; set; }

    [JsonPropertyName("watchCount")]
    public int WatchCount { get; set; }

    [JsonPropertyName("unenforceableCount")]
    public int UnenforceableCount { get; set; }

    [JsonPropertyName("riskLevel")]
    public string RiskLevel { get; set; } = "Low";
}

public class AuditResult
{
    [JsonPropertyName("auditId")]
    public string AuditId { get; set; } = Guid.NewGuid().ToString();

    [JsonPropertyName("jurisdiction")]
    public string Jurisdiction { get; set; } = string.Empty;

    [JsonPropertyName("jurisdictionName")]
    public string JurisdictionName { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("isFtaasEnhanced")]
    public bool IsFtaasEnhanced { get; set; }

    [JsonPropertyName("summary")]
    public AuditSummary Summary { get; set; } = new();

    [JsonPropertyName("clauses")]
    public List<Clause> Clauses { get; set; } = new();
}

public class ExtractionResult
{
    [JsonPropertyName("fileName")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("extractedText")]
    public string ExtractedText { get; set; } = string.Empty;

    [JsonPropertyName("characterCount")]
    public int CharacterCount { get; set; }

    [JsonPropertyName("estimatedClauses")]
    public int EstimatedClauses { get; set; }
}

public class DisputeRequest
{
    [JsonPropertyName("jurisdiction")]
    public string Jurisdiction { get; set; } = "FED";

    [JsonPropertyName("tenantName")]
    public string TenantName { get; set; } = string.Empty;

    [JsonPropertyName("landlordName")]
    public string LandlordName { get; set; } = string.Empty;

    [JsonPropertyName("propertyAddress")]
    public string PropertyAddress { get; set; } = string.Empty;

    [JsonPropertyName("letterType")]
    public LetterType LetterType { get; set; } = LetterType.PreSigning;

    [JsonPropertyName("flaggedClauses")]
    public List<Clause> FlaggedClauses { get; set; } = new();
}

public class DisputeResult
{
    [JsonPropertyName("letterMarkdown")]
    public string LetterMarkdown { get; set; } = string.Empty;

    [JsonPropertyName("letterPlaintext")]
    public string LetterPlaintext { get; set; } = string.Empty;

    [JsonPropertyName("statutesCited")]
    public List<string> StatutesCited { get; set; } = new();
}
