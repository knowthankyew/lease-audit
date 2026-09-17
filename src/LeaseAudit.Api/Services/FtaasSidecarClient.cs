using System.Net.Http.Json;
using LeaseAudit.Api.Models;

namespace LeaseAudit.Api.Services;

public class FtaasSidecarClient
{
    private readonly HttpClient _httpClient;
    private const string BaseUrl = "http://localhost:8000";

    public FtaasSidecarClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.Timeout = TimeSpan.FromMilliseconds(500);
    }

    public async Task<bool> IsSidecarAvailableAsync()
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(250));
            var response = await _httpClient.GetAsync($"{BaseUrl}/health", cts.Token);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            // Silently return false when absent
            return false;
        }
    }

    public async Task<List<Clause>> TryEnhanceClausesAsync(List<Clause> clauses, CancellationToken cancellationToken = default)
    {
        // Standalone-first design: silently return original clauses if sidecar is absent
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(500));
            var response = await _httpClient.PostAsJsonAsync($"{BaseUrl}/v1/classify-clauses", new { clauses }, cts.Token);
            if (response.IsSuccessStatusCode)
            {
                var enhanced = await response.Content.ReadFromJsonAsync<List<Clause>>(cancellationToken: cts.Token);
                if (enhanced != null && enhanced.Count == clauses.Count)
                    return enhanced;
            }
        }
        catch
        {
            // Silently fallback to deterministic segmentation
        }

        return clauses;
    }
}
