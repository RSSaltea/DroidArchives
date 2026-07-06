# Super Rebirth cycle data

Each Super Rebirth cycle has its own JSON file. Every rebirth entry contains:

- `to`: the rebirth number.
- `creditsCost`: the credits required for that rebirth.
- `requiredDroids`: the three required droids and their variants.

Valid variants are `DEFAULT`, `GOLD`, `DIAMOND`, `RAINBOW`, and `BESKAR`.

To add another cycle:

1. Copy an existing cycle file and rename it, such as `cycle-5.json`.
2. Edit its rebirth requirements.
3. Add the filename to the end of the `cycles` array in `index.json`.

The website builds its cycle selector from `index.json`. Super Rebirth automatically advances through every listed cycle and wraps from the final cycle back to Cycle 1.
