---
type: "Testing Reference"
title: "All-system-body generation QA"
tags:
- world-forge
- testing
---
# All-system-body generation QA

Validation target: World Forge 0.3.49.

Required gates:

- Every non-primary body receives an eligible capability-resolved lifecycle record.
- Queue-all includes moons, rocky planets, gas giants, ice giants, dwarfs, and belts present in the generated system.
- Profile graphs omit irrelevant solid, giant, or belt nodes.
- Generated artifacts survive JSON roundtrip and source invalidation.
- System View replaces scaffolds with generated profile materials.
- Every generated non-primary body can open in detailed Globe View.
- Primary-world output remains equivalent between Detailed and Experimental workflows.
