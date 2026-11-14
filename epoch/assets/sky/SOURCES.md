# Epoch sky panorama assets — CC0

The day/night preview uses Poly Haven's original CC0 **pure-sky** HDRI
photographs. We do **not** embed the 8K–24K originals in the game.

* `day.webp`: [Kloofendal 48d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), original by Greg Zaal, sky edits by Jarod Guest.
* `night.webp`: [Kloppenheim 02 (Pure Sky)](https://polyhaven.com/a/kloppenheim_02_puresky), original by Greg Zaal, sky edits by Jarod Guest.

Both artworks are distributed under the [CC0 1.0 license](https://creativecommons.org/publicdomain/zero/1.0/).
Attribution is not required, but included here for provenance.

To regenerate: run `python3 epoch/scripts/build-sky-assets.py` from the
repository root with Pillow installed. The script reads each official
asset's publicly documented Poly Haven file manifest, downloads its
tonemapped panorama, resizes to 2048×1024 and exports compressed WebP.

The GitHub sky asset workflow performs this conversion and commits the
resulting `day.webp`, `night.webp` and `manifest.json` to the
repository. **The game loads the committed local images** rather than
retrieving Poly Haven images at runtime.

These are *static* preview skyboxes for phase 6C.1A/B. Clock-based blending
and sun/moon movement are reserved for 6C.1C–D.
