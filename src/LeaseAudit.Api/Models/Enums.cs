using System.Text.Json.Serialization;

namespace LeaseAudit.Api.Models;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ClauseSeverity
{
    Standard,
    Watch,
    LikelyUnenforceable
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ClauseCategory
{
    SecurityDeposit,
    LateFees,
    EntryNotice,
    HabitabilityRepairs,
    EvictionLockout,
    TerminationRenewal,
    Disclosures,
    General
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum LetterType
{
    PreSigning,
    TenancyDispute
}
