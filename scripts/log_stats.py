import re
import os
from collections import defaultdict, Counter
from datetime import datetime

LOG_FILE   = '/var/log/crisprte/api_access.log'
STATS_FILE = '/var/log/crisprte/stats.log'

def parse_log(filepath):
    records = []
    if not os.path.exists(filepath):
        return records
    pattern = re.compile(
    r'\[(\d{4}-\d{2}-\d{2}) [\d:]+\].*key=([\w-]+) ga=([\w-]+) te_dup=([\w_-]+) source=([\w-]+) status=(\d+) time=(\d+)ms'
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
                    'te_dup':  m.group(4),
                    'source': m.group(5),
                    'status': int(m.group(6)),
                    'time':   int(m.group(7)),
                })
    return records

def format_operations(records, total):
    lines = []

     # Single TE Copy: getGRNAByTedup + 'dup' in te_dup
    f1 = sum(1 for r in records
             if r['key'] == 'getGRNAByTedup' and ('dup' in r['te_dup'] or 'copy' in r['te_dup']))
    percentage1 = round(f1 / total * 100) if total > 0 else 0
    lines.append(f"    {'Targeting Single TE Copy':<45} {f1:>5}")
    # lines.append(f"    {'Targeting Single TE Copy':<45} {f1:>5} ({percentage1}%)")

    # TE Subfamily: getGRNAByTedup without 'dup', or getGRNACombinationByTeclass
    f2 = sum(1 for r in records
             if (r['key'] == 'getGRNAByTedup' and 'dup' not in r['te_dup'] and 'copy' not in r['te_dup'])
             or r['key'] == 'getGRNACombinationByTeclass')
    percentage2 = round(f2 / total * 100) if total > 0 else 0
    lines.append(f"    {'Targeting TE Subfamily':<45} {f2:>5}")
    # lines.append(f"    {'Targeting TE Subfamily':<45} {f2:>5} ({percentage2}%)")

    # Targeting TEs within Genomic Coordinate: getGtfByRegion
    f3 = sum(1 for r in records if (r['key'] == 'getGtfByRegion' and r.get('source') == 'design'))
    percentage3 = round(f3 / total * 100) if total > 0 else 0
    lines.append(f"    {'Targeting TEs within Genomic Coordinate':<45} {f3:>5}")
    # lines.append(f"    {'Targeting TEs within Genomic Coordinate':<45} {f3:>5} ({percentage3}%)")

    # others
    # others = total - f1 - f2 - f3
    # others_percentage = round(others / total * 100) if total > 0 else 0
    # lines.append(f"    {'others':<45} {others:>5} ({others_percentage}%)")

    return "\n".join(lines)

def make_stats(records):
    if not records:
        return "No query records found. No report generated."
        
    monthly = defaultdict(list)
    for r in records:
        monthly[r['month']].append(r)

    lines = []

    # ── Monthly Stats ──────────────────────────
    lines.append("=" * 65)
    lines.append("Monthly Statistics")
    lines.append("=" * 65)
    for month in sorted(monthly.keys()):
        m_record = monthly[month]
        total = len(m_record)
        ok    = sum(1 for r in m_record if r['status'] == 200)
        err   = total - ok
        avg_t = round(sum(r['time'] for r in m_record) / total)
        ga_count = Counter(r['ga'] for r in m_record if r['ga'] != '-')

        lines.append(f"\n[{month}]")
        lines.append(f"  Total requests : {total}")
        lines.append(f"  Success        : {ok}")
        lines.append(f"  Success Rate   : {round(ok / total * 100) if total > 0 else 0}%")
        lines.append(f"  Avg response   : {avg_t} ms")
        lines.append(f"  Species        : " + " | ".join(f"{k}: {v}" for k, v in ga_count.items()))
        lines.append(f"  Operations:")
        lines.append(format_operations(m_record, total))

    # ── Cumulative Stats ───────────────────────
    lines.append("\n" + "=" * 65)
    lines.append("Cumulative Statistics (All Time)")
    lines.append("=" * 65)
    total = len(records)
    if total == 0:
        lines.append("  No data available.")
    else:
        ok    = sum(1 for r in records if r['status'] == 200)
        err   = total - ok
        avg_t = round(sum(r['time'] for r in records) / total)
        ga_count = Counter(r['ga'] for r in m_record if r['ga'] != '-')
        dates = sorted(set(r['date'] for r in records))

        lines.append(f"  Date range     : {dates[0]} ~ {dates[-1]}")
        lines.append(f"  Total requests : {total}")
        lines.append(f"  Success        : {ok}")
        lines.append(f"  Success Rate   : {round(ok / total * 100) if total > 0 else 0}%")
        lines.append(f"  Avg response   : {avg_t} ms")
        lines.append(f"  Species        : " + " | ".join(f"{k}: {v}" for k, v in ga_count.items()))
        lines.append(f"  Operations:")
        lines.append(format_operations(records, total))

    # current month notice
        current_month = datetime.now().strftime('%Y-%m')
        if current_month not in monthly:
            lines.append(f"\n[{current_month}]")
            lines.append("  No user queries this month.")
    
    return "\n".join(lines)

if __name__ == '__main__':
    records = parse_log(LOG_FILE)
    report = make_stats(records)
    print(report)
    with open(STATS_FILE, 'w') as f:
        f.write(f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(report + "\n")
    print(f"\nReport saved to {STATS_FILE}")