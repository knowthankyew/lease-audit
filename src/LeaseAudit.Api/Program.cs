using LeaseAudit.Api.Models;
using LeaseAudit.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddSingleton<DocumentExtractor>();
builder.Services.AddSingleton<ClauseSegmenter>();
builder.Services.AddSingleton<RuleEvaluationEngine>();
builder.Services.AddSingleton<DisputeLetterService>();
builder.Services.AddHttpClient<FtaasSidecarClient>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// API Endpoints

// 1. Audit Endpoint
app.MapPost("/api/audit", async (
    AuditRequest request,
    ClauseSegmenter segmenter,
    RuleEvaluationEngine engine,
    FtaasSidecarClient sidecarClient) =>
{
    if (string.IsNullOrWhiteSpace(request.RawText))
    {
        return Results.BadRequest(new { error = "Lease text cannot be empty." });
    }

    var clauses = segmenter.Segment(request.RawText);
    bool isEnhanced = false;

    if (await sidecarClient.IsSidecarAvailableAsync())
    {
        var enhanced = await sidecarClient.TryEnhanceClausesAsync(clauses);
        if (enhanced != clauses)
        {
            clauses = enhanced;
            isEnhanced = true;
        }
    }

    var result = engine.Evaluate(clauses, request.Jurisdiction);
    result.IsFtaasEnhanced = isEnhanced;

    return Results.Ok(result);
});

// 2. Extract Document Endpoint
app.MapPost("/api/extract", async (
    IFormFile file,
    DocumentExtractor extractor,
    ClauseSegmenter segmenter,
    CancellationToken ct) =>
{
    if (file == null || file.Length == 0)
    {
        return Results.BadRequest(new { error = "No file uploaded or file is empty." });
    }

    // Max 25 MB limit for safety
    if (file.Length > 25 * 1024 * 1024)
    {
        return Results.BadRequest(new { error = "File size exceeds 25 MB limit." });
    }

    using var stream = file.OpenReadStream();
    var text = await extractor.ExtractTextAsync(stream, file.FileName, ct);
    var estimated = segmenter.Segment(text).Count;

    return Results.Ok(new ExtractionResult
    {
        FileName = file.FileName,
        ExtractedText = text,
        CharacterCount = text.Length,
        EstimatedClauses = estimated
    });
});

// 3. Get Rules Endpoint
app.MapGet("/api/rules/{jurisdiction}", (string jurisdiction, RuleEvaluationEngine engine) =>
{
    var rules = engine.GetJurisdictionRules(jurisdiction);
    return rules != null ? Results.Ok(rules) : Results.NotFound(new { error = $"Jurisdiction '{jurisdiction}' not found." });
});

// 4. Dispute Letter Generator Endpoint
app.MapPost("/api/dispute/draft", (DisputeRequest request, DisputeLetterService letterService) =>
{
    var result = letterService.GenerateLetter(request);
    return Results.Ok(result);
});

// 5. Privacy Purge Endpoint ("Burn Local Data")
app.MapPost("/api/privacy/purge", () =>
{
    // Force immediate garbage collection and memory trim
    GC.Collect();
    GC.WaitForPendingFinalizers();
    GC.Collect();
    return Results.NoContent();
});

// 6. Health & Diagnostics Endpoint
app.MapGet("/api/health", async (FtaasSidecarClient sidecarClient) =>
{
    var sidecarAvailable = await sidecarClient.IsSidecarAvailableAsync();
    return Results.Ok(new
    {
        status = "healthy",
        version = "1.0.0",
        engine = ".NET 10 Minimal API",
        airGapped = true,
        ftaasSidecar = sidecarAvailable ? "connected" : "standby (graceful fallback)"
    });
});

app.Run();
