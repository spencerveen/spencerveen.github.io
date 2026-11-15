# EPOCH — Phase 7A.2A: Wilderness Tribal Families

**Implemented:** Deterministic pre-existing families in newly encountered
wilderness tribes, with stable parent IDs, partners and young characters.
This is family *generation*, not a full family-housing or birth simulation.

## Family generation

- The original seeded tribe placement, names, leader identities, member IDs,
  sex, coordinates and population (2–5) are never rerolled or augmented.
- A **separate** seeded random stream decides whether the existing members
  are a family, leaving the original terrain and tribe-generator sequence alone.
- Approximately **65%** of new tribes receive one family unit. Other tribes
  remain unrelated adults; not every camp is a nuclear family.
- Family arrangements include a single adult and child or two adult parents
  and one or two children. The original leader remains an adult and may
  be the head of the seeded family. No family has more than two initial children.
- Children start at ages **2–15**; parents are aged at least **34**, so
  all generated parent-child age gaps are at least 19 years.
- Parent IDs are saved on each child. Both parents reference the same
  seeded household, and adult partners reference each other reciprocally.
  Relatives and parent-child pairs cannot become future romantic partners
  through the normal 7A.1 friendship progression.
- Parents retain their original male or female avatar sex. Female/male
  parents are shown as Mother/Father in the encounter and profile screens.
  A two-parent household is not forced to contain a mother and father.

## Existing save compatibility

The new record property **`familyVersion`** is saved when the tribe is
discovered. Previously discovered tribes without this property normalize to
`familyVersion: 0`. Those tribes retain their *exact original* roster
and ages instead of suddenly changing an established adult into a child.
Undiscovered tribes use version 1, with deterministic new family ties.
The old placementVersion 1/2 distinction is independent of familyVersion.

## Wilderness and recruitment

Wilderness children now use a smaller version of the existing Quaternius
character, while keeping the same click/interact and terrain streaming rules.
The leader and parents remain full-size.

The tribe encounter identifies parents and children by relationship,
displays the number of children and preserves the original trust quests.
Recruitment still invites the *entire tribe* and requires enough existing
settlement capacity for every arrival. Children do **not** add free beds.

Every arriving villager retains stable `parentIds`, `partnerId`,
`householdId`, `familyRole`, and `headOfHousehold` metadata.
Original adult partners are seeded into the reciprocal 7A.1 relationship
system, and parents and children appear in linked resident profiles.
Children display their proper age and a smaller model after recruitment.
They are not allowed to take adult gathering professions until age 18.
Ordinary resident aging already advances recruited children on the active
village clock.

## Out of scope until later milestones

**7A.2B:** Reserve whole family Huts, appoint household heads, increase
Hut capacity from three to four beds, and make family moves together.

**7A.2C:** Wilderness-child aging, dedicated child/teen animations,
play, learning, age-specific routines and supervised work.

**7A.2D:** New births, fertility/food rules, expanded households, childcare,
and living generations. No new child is born during 7A.2A.

Currently discovered-but-unrecruited wilderness children do not advance
their ages when the player returns decades later; that is a known 7A.2C task.

## Checks

`tests/check-tribe-families.mjs` exercises deterministic family graphs,
adult/child age validation, stable existing ID/location data, save migrations,
reciprocal partnerships, family profile links and recruitment.

`tests/browser-tribe-families.mjs` checks child character size and visible
family details in an actual 3D wilderness encounter.
