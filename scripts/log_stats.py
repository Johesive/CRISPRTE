import re
from collections import defaultdict, Counter
from datetime import datetime

LOG_FILE   = '/var/log/crisprte/api_access.log'
STATS_FILE = '/var/log/crisprte/stats.log'

ALL_OPERATIONS = [
    'getGRNAByTedup',              
    'getMismatchBedGseq',          
    'getGRNACombinationByTeclass', 
]

def parse_log(filepath):
    records = []
    if not os.path.exists(filepath):
        return records
    pattern = re.compile(
        r'\[(\d{4}-\d{2}-\d{2}) [\d:]+\].*key=([\w-]+) ga=([\w-]+) status=(\d+) time=(\d+)ms'
    )
    with open(filepath, 'r') as f:
        for line in f:
            m = pattern.search(line)
            if m:
                records.append({
                    'date':   m.group(1),
                    'month':  m.group(1)[:7],
                    'key':    m.group(2),
                    'ga':     m.group(3),
                    'status': int(m.group(4)),
                    'time':   int(m.group(5)),
                })
    return records

def format_operations(records, total):
    key_count = Counter(r['key'] for r in records)
    lines = []

    # three main functions
    for op in ALL_OPERATIONS:
        count = key_count.get(op, 0)
        percentage = round(count / total * 100) if total > 0 else 0
        lines.append(f"    {op:<40} {count:>5} ({percentage}%)")

    # others
    known = set(ALL_OPERATIONS)
    others_count = sum(v for k, v in key_count.items() if k not in known)
    others_percentage = round(others_count / total * 100) if total > 0 else 0
    lines.append(f"    {'others':<40} {others_count:>5} ({others_percentage}%)")
    return "\n".join(lines)

def make_stats(records):
    if not records:
        return "No query records found. No report generated."
        
    monthly = defaultdict(list)
    for r in records:
        monthly[r['month']].append(r)

    lines = []

    # ── Monthly Stats ──────────────────────────
    lines.append("=" * 60)
    lines.append("Monthly Statistics")
    lines.append("=" * 60)
    for month in sorted(monthly.keys()):
        m_record = monthly[month]
        total = len(m_record)
        ok    = sum(1 for r in m_record if r['status'] == 200)
        err   = total - ok
        avg_t = round(sum(r['time'] for r in m_record) / total)
        ga_count = Counter(r['ga'] for r in m_record)

        lines.append(f"\n[{month}]")
        lines.append(f"  Total requests : {total}")
        lines.append(f"  Success        : {ok}")
        lines.append(f"  Success Rate   : {round(ok / total * 100) if total > 0 else 0}%")
        lines.append(f"  Avg response   : {avg_t} ms")
        lines.append(f"  Species        : " + " | ".join(f"{k}: {v}" for k, v in ga_count.items()))
        lines.append(f"  Operations:")
        lines.append(format_operations(m_record, total))

    # ── Cumulative Stats ───────────────────────
    lines.append("\n" + "=" * 60)
    lines.append("Cumulative Statistics (All Time)")
    lines.append("=" * 60)
    total = len(records)
    if total == 0:
        lines.append("  No data available.")
    else:
        ok    = sum(1 for r in records if r['status'] == 200)
        err   = total - ok
        avg_t = round(sum(r['time'] for r in records) / total)
        ga_count = Counter(r['ga'] for r in records)
        dates = sorted(set(r['date'] for r in records))

        lines.append(f"  Date range     : {dates[0]} ~ {dates[-1]}")
        lines.append(f"  Total requests : {total}")
        lines.append(f"  Success        : {ok}")
        lines.append(f"  Success Rate   : {round(ok / total * 100) if total > 0 else 0}%")
        lines.append(f"  Avg response   : {avg_t} ms")
        lines.append(f"  Species        : " + " | ".join(f"{k}: {v}" for k, v in ga_count.items()))
        lines.append(f"  Operations:")
        lines.append(format_operations(records, total))

    return "\n".join(lines)

if __name__ == '__main__':
    records = parse_log(LOG_FILE)
    report = make_stats(records)
    print(report)
    with open(STATS_FILE, 'w') as f:
        f.write(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(report + "\n")
    print(f"\nReport saved to {STATS_FILE}")