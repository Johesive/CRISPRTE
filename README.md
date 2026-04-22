# CRISPR-TE Usage Analytics

A log parsing and analytics module for [CRISPR-TE](https://www.crisprte.cn), 
classifying user design requests into three operation modes and generating 
monthly/cumulative usage statistics.

> **Related Publication:** 
> Guo, Y., Xue, Z., Gong, M., Jin, S., Wu, X., & Liu, W. (2024).
> CRISPR-TE: a web-based tool to generate single guide RNAs targeting 
> transposable elements. Mobile DNA, 15(1), 3. [DOI](https://doi.org/10.1186/s13100-024-00313-0)

---

## Background

CRISPR-TE is a web tool that designs sgRNAs for CRISPR-mediated transposable 
element (TE) manipulation. To understand how researchers use the tool, we built 
a log classification and reporting system that parses backend request logs and 
categorizes each design request by operation mode, species, and outcome.

---

## Operation Mode Classification

All user interactions with the sgRNA design engine are classified into three 
mutually exclusive modes based on the API endpoint and request parameters:

| Mode | Detection Logic | Use Case |
|------|----------------|----------|
| **Targeting Single TE Copy** | `key = getGRNAByTedup` AND `te_dup` contains `dup` or `copy` | Design sgRNAs for a specific TE copy with minimal off-targets |
| **Targeting TE Subfamily** | `key = getGRNAByTedup` (without `dup`/`copy` in `te_dup`) OR `key = getGRNACombinationByTeclass` | Batch sgRNA design at the subfamily level using greedy coverage optimization |
| **Targeting TEs within Genomic Coordinate** | `key = getGtfByRegion` AND `source = design` | Query TEs within a user-specified genomic interval and design sgRNAs |

### Disambiguation of `getGtfByRegion`

A key challenge is that the `getGtfByRegion` endpoint is shared across multiple 
internal workflows (genome browsing, annotation lookup, etc.), not just 
user-initiated design requests. Relying on the endpoint name alone would 
conflate design operations with unrelated calls.

**Solution:** A `source=design` parameter was added to the frontend JavaScript 
at the corresponding call site. This parameter is propagated to the backend log, 
enabling accurate filtering during log parsing:

```

# In the raw log, a genuine design request looks like:

key=getGtfByRegion&source=design&chr=chr1&start=1000000&end=2000000

# A non-design call (e.g., browsing) lacks the source field:

key=getGtfByRegion&chr=chr1&start=1000000&end=2000000

```

---

## Example Output

```

Generated at: 2026-03-17 20:53:59

================================================================

Monthly Statistics

================================================================

[2026-03]

Total requests : 19

Success        : 19

Success Rate   : 100%

Avg response   : 642 ms

Species        : hg38: 15 | mm10: 4

Operations:

Targeting Single TE Copy                    0

Targeting TE Subfamily                      1

Targeting TEs within Genomic Coordinate     1

================================================================

Cumulative Statistics (All Time)

================================================================

Date range     : 2026-03-17 ~ 2026-03-17

Total requests : 19

Success        : 19

Success Rate   : 100%

Avg response   : 642 ms

Species        : hg38: 15 | mm10: 4

Operations:

Targeting Single TE Copy                    0

Targeting TE Subfamily                      1

Targeting TEs within Genomic Coordinate     1

```

### Report Fields

| Field | Description |
|-------|-------------|
| `Total requests` | Total number of design API calls in the period |
| `Success / Success Rate` | Requests that returned valid sgRNA results |
| `Avg response` | Mean server response time (ms) |
| `Species` | Breakdown by genome assembly (`hg38` = human, `mm10` = mouse, `rn6` = rat) |
| `Operations` | Count per operation mode (see classification table above) |

---

## Project Context

This module is part of a broader effort to maintain and extend CRISPR-TE, 
including:

- **Bug fixes:** 9 critical issues in the C/Python codebase (buffer overflows, 
  memory leaks, type mismatches in the Aho-Corasick trie and gRNA scoring 
  pipeline)
- **Performance optimization:** Reduced full-genome scoring runtime from 112 
  days to 22 days via vectorized SQL, batched ML inference, and 16-core 
  parallelization
- **Multi-species expansion:** Integrated rat genome (rn6) with RepeatMasker 
  and Ensembl annotations
- **Cas13 extension:** RNA-targeting sgRNA design (in progress)

---

## Tech Stack

- **Backend:** Python, Django, PostgreSQL
- **Core algorithms:** C (Aho-Corasick automaton, Trie with Hamming distance 
  mismatch search)
- **ML scoring:** scikit-learn (Azimuth), Biopython
- **Frontend:** JavaScript, HTML/CSS
- **Deployment:** Linux server (128-core HPC)
