# Polar Climate and Foundation Profiling Validation Status

Updated: 2026-08-02

Implementation branch: `agent/polar-climate-foundation-profiling`

Pull request: #112

Current implementation head before validation trigger: `c2afee1e8ff2834c8b5f106a959c230542cdb4af`

Validation state: the implementation now carries the Experimental latitude profile through both Initial world foundation and final deep-time climate reconciliation. Direct graph-node callers default to the legacy profile. The revised calibration and reason for moving from the originally proposed 40 C linear candidate to a 52 C mean-centered power candidate are documented in `refs/planning/polar-climate-calibration-decision.md`.

Earlier gates established:

- TypeScript passed after the first wiring correction;
- 329 of 334 tests passed;
- finer Initial world foundation profiling passed;
- warm/cold ordering passed;
- Experimental deterministic replay passed;
- the remaining failures identified the missing direct-node fallback and the final deep-time overwrite, both now corrected.

Experimental remains the only workflow using the mean-centered power-profile candidate. Detailed remains the production baseline.

Evidence to add after validation:

- repository verification result;
- fixed-seed integration outcomes;
- Detailed versus Experimental polar diagnostics;
- system and orbit equivalence result;
- profiling phase inventory;
- manual visual QA result and promotion decision.
