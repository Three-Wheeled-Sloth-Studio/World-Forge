import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export function ReleaseNotesModal({ version, onClose }: { version: string; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal((
    <div className="modal-backdrop release-notes-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="release-notes-modal" role="dialog" aria-modal="true" aria-labelledby="release-notes-title">
        <header className="release-notes-header">
          <div>
            <span>Current build v{version}</span>
            <h2 id="release-notes-title">Release notes and roadmap</h2>
          </div>
          <button type="button" className="icon-button" title="Close release notes" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="release-notes-body">
          <section>
            <p className="release-kicker">Release 0.3.39</p>
            <h3>The camera moves. The planet keeps its job.</h3>
            <ul>
              <li>Horizontal and vertical globe drag now orbit the observer camera around the fixed physical system.</li>
              <li>Generated axial tilt, clock-derived planetary spin, and stellar light remain authoritative during inspection.</li>
              <li>Holding the globe pauses the shared clock, keeping geography and the day line locked while the camera inspects daylight, night, poles, and terminator.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.36</p>
            <h3>Optional enrichment becomes a real workflow</h3>
            <ul>
              <li>Orbital presentation context is prepared only after first Globe use, never during ordinary world generation.</li>
              <li>The new System Orbital Context workflow is versioned, inspectable in Dev, instrumented by node, deterministic, validated, cancellable, and saved with the project.</li>
              <li>Globe view shows visible preparation, completion, stale, and failure state instead of hiding first-use work.</li>
              <li>The artifact establishes stable star, planet, and moon motion inputs for the next living-globe visual cycle.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.35</p>
            <h3>The stopwatch was blaming the telescope</h3>
            <ul>
              <li>Native stage timing now follows the actual foundation graph instead of waiting for preview frames emitted after the work.</li>
              <li>Initial topology, crust, climate, hydrology, and projection work is reported as Initial world foundation rather than System and orbit.</li>
              <li>Equirectangular projection reuses one deterministic topology lookup across initial projection, previews, final projection, and biome cleanup.</li>
              <li>Biome diagnostics sort their variance sample once instead of rebuilding the same ordered data three times.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.34</p>
            <h3>Generation timing you can actually see</h3>
            <ul>
              <li>Live generation now shows total wall time and active-stage elapsed time beside progress.</li>
              <li>Build retains the last completed run with workflow provenance, completion time, total duration, slowest stage, and the native-stage breakdown.</li>
              <li>The timing surface exposes existing telemetry without changing generator output or workflow behavior.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.33</p>
            <h3>Dropdowns that know when to leave</h3>
            <ul>
              <li>Layers and zoom now close on outside interaction, Escape, competing popovers, and workspace-context changes.</li>
              <li>The right-panel collapse control no longer overlaps world or context titles.</li>
              <li>The standalone account control restores the signed-in Google avatar with a safe icon fallback.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.32</p>
            <h3>Explore controls without the cockpit clutter</h3>
            <ul>
              <li>Map and globe, presentation, map subject, point inspection, zoom, and Fit remain immediately available.</li>
              <li>Rivers, plate boundaries, hex overlays, coastline treatment, globe shells, and preview detail now live in one Layers menu.</li>
              <li>The zoom readout opens common zoom levels on a normal click, while Fit resets the active map or globe view.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.31</p>
            <h3>One context at a time</h3>
            <ul>
              <li>Build, Explore, Export, and Dev now route the right panel from the shared workspace state.</li>
              <li>Explore shows one active inspector or the world summary instead of stacking unrelated panels.</li>
              <li>Export now contains common files, PNG resolution, hex tiles, VTT options, and visible task feedback.</li>
              <li>.wforge opening moved to My Worlds, while diagnostics moved behind the Dev workspace.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.30</p>
            <h3>Build controls that describe what they do</h3>
            <ul>
              <li>Quick Build now keeps world, star, seeds, generation quality, randomization, and the primary action together.</li>
              <li>Generate becomes Regenerate when replacing a loaded world, which remains visible until replacement succeeds.</li>
              <li>Advanced generation inputs are grouped by world shape, climate, geology, hydrology, and system, with corrected continent terminology.</li>
              <li>Preview and PNG output resolution moved to Explore and Export instead of pretending to be generation inputs.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.29</p>
            <h3>One workspace mode owner</h3>
            <ul>
              <li>Build, Explore, and Export mode now belongs to the application shell instead of the map component.</li>
              <li>Generated and opened worlds move into Explore through explicit project-loading paths.</li>
              <li>The generator and details panels now receive the same mode state for the next contextual-panel increment.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.28</p>
            <h3>World-building workspace modes</h3>
            <ul>
              <li>Build, Explore, and Export are now explicit workspace modes while the current map remains mounted.</li>
              <li>Presentation and inspection controls appear in Explore, while common download actions appear in Export.</li>
              <li>Internal Debug map subjects and globe composites are no longer exposed in the ordinary Explore controls.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.27</p>
            <h3>Detailed generation promoted</h3>
            <ul>
              <li>The faster, science-informed generation workflow is now the primary World Generation (Detailed) path.</li>
              <li>The previous shared-stream workflow remains available as World Generation (Legacy) for rollback and comparison.</li>
              <li>A behavior-identical World Generation (Experimental) copy now provides a clean track for further optimization.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.26</p>
            <h3>High-resolution terrain performance</h3>
            <ul>
              <li>High-resolution corridor repair now works from its affected-cell mask instead of repeatedly scanning the full topology.</li>
              <li>Topology stabilization reuses reference-scale topology and limits reduction and expansion work to affected neighborhoods.</li>
              <li>Diagnostic benchmarks now report deterministic output signatures and non-overlapping internal timing boundaries.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.25</p>
            <h3>High-resolution terrain continuity</h3>
            <ul>
              <li>Tectonic and fragment-history deformation now retain a stable physical width as source topology resolution increases.</li>
              <li>Continental fragments on the same plate now share one rigid spherical transform instead of drifting apart independently.</li>
              <li>Narrow vacated fragment corridors are repaired without filling broad rifts or ocean basins.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.16</p>
            <h3>Structural terrain integrity</h3>
            <ul>
              <li>Rigid continental drift now inverse-samples transformed fragments instead of forward-splatting cells into gaps and directional spill ribbons.</li>
              <li>Fixed-seed native-stage diagnostics now isolate terrain changes across initial tectonics, fragment placement, surface aging, and fragment-history response.</li>
              <li>The generator compatibility version advanced because fresh worlds produce corrected authoritative elevation.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.13</p>
            <h3>Embedded build provenance</h3>
            <ul>
              <li>World Forge now reports its loaded runtime version and source commit to the Parchment Worlds shell when embedded.</li>
              <li>The embedded build message responds to shell requests so hosted deployments do not get stuck on a stale loading state.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.3.12</p>
            <h3>Tool version ownership</h3>
            <ul>
              <li>Prepared the public tool bundle to identify its own build instead of relying on a shell-side version label.</li>
            </ul>
          </section>

          <section>
            <p className="release-kicker">Release 0.2.0</p>
            <h3>Detailed planet generation refinement</h3>
            <ul>
              <li>Reworked terrain, sea level, coastlines, erosion, hydrology, and biome generation into a more physically coherent planet pipeline.</li>
              <li>Added basin-aware atmospheric and ocean circulation, including packed gyre assignment, terrain steering, and coast-following currents.</li>
              <li>Reduced unsupported micro-biomes while retaining collapsed local detail for future zoomed-in terrain generation.</li>
              <li>Expanded generation diagnostics across climate, rivers, biome transitions, elevation, tree line, ice line, and validation matrices.</li>
              <li>Improved globe and map inspection, visual debugging modes, export behavior, saved worlds, and generation workflow reliability.</li>
            </ul>
          </section>

          <section className="release-roadmap">
            <p className="release-kicker">Roadmap</p>
            <article>
              <h3>Performance updates</h3>
              <p>Decompose generation into independently measurable nodes, then optimize each node without changing its output contract.</p>
            </article>
            <article>
              <h3>Visual options updates</h3>
              <p>Broaden presentation controls, layer styling, map and globe polish, and reusable visual presets.</p>
            </article>
            <article>
              <h3>VTT integration</h3>
              <p>Improve map packaging, grid metadata, scale controls, and direct workflows for common virtual tabletop platforms.</p>
            </article>
          </section>
        </div>
      </section>
    </div>
  ), document.body);
}
