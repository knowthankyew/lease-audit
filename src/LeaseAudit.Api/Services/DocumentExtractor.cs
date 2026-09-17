using System.Text;
using System.Text.RegularExpressions;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using UglyToad.PdfPig;

namespace LeaseAudit.Api.Services;

public class DocumentExtractor
{
    public async Task<string> ExtractTextAsync(Stream stream, string fileName, CancellationToken cancellationToken = default)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();

        return ext switch
        {
            ".pdf" => ExtractFromPdf(stream),
            ".docx" => ExtractFromDocx(stream),
            _ => await ExtractFromPlainTextAsync(stream, cancellationToken)
        };
    }

    public string ExtractFromPdf(Stream stream)
    {
        using var memoryStream = new MemoryStream();
        stream.CopyTo(memoryStream);
        memoryStream.Position = 0;

        var sb = new StringBuilder();
        using (var document = PdfDocument.Open(memoryStream))
        {
            foreach (var page in document.GetPages())
            {
                var text = page.Text;
                if (!string.IsNullOrWhiteSpace(text))
                {
                    sb.AppendLine(text);
                    sb.AppendLine();
                }
            }
        }

        return NormalizeText(sb.ToString());
    }

    public string ExtractFromDocx(Stream stream)
    {
        using var memoryStream = new MemoryStream();
        stream.CopyTo(memoryStream);
        memoryStream.Position = 0;

        var sb = new StringBuilder();
        using (var wordDoc = WordprocessingDocument.Open(memoryStream, false))
        {
            var body = wordDoc.MainDocumentPart?.Document?.Body;
            if (body != null)
            {
                foreach (var paragraph in body.Elements<Paragraph>())
                {
                    var text = paragraph.InnerText;
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        sb.AppendLine(text);
                    }
                }
            }
        }

        return NormalizeText(sb.ToString());
    }

    public async Task<string> ExtractFromPlainTextAsync(Stream stream, CancellationToken cancellationToken = default)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        var content = await reader.ReadToEndAsync(cancellationToken);
        return NormalizeText(content);
    }

    public static string NormalizeText(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return string.Empty;

        // Replace control chars (except \r, \n, \t)
        var cleaned = Regex.Replace(raw, @"[\x00-\x08\x0B\x0C\x0E-\x1F]", "");

        // Replace smart quotes and dashes
        cleaned = cleaned
            .Replace('“', '"')
            .Replace('”', '"')
            .Replace('‘', '\'')
            .Replace('’', '\'')
            .Replace('—', '-')
            .Replace('–', '-');

        // Normalize newlines to \n
        cleaned = cleaned.Replace("\r\n", "\n").Replace("\r", "\n");

        // Collapse 3+ newlines into 2
        cleaned = Regex.Replace(cleaned, @"\n{3,}", "\n\n");

        // Trim leading and trailing whitespace
        return cleaned.Trim();
    }
}
