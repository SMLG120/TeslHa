# Vehicle reference checklist

Official pages reviewed on **8 November 2026** (tesla.com, US region). They were viewed in a browser for proportions and features only. No images or 3D assets were downloaded, extracted or reused. Every car in the TeslHa studio is a **parametric procedural representation**, not manufacturer CAD. The homepage hero's Roadster is a third-party community model (GT Cars, CC BY 4.0; see the README), also not manufacturer CAD.

Legend: ✅ represented · ◐ approximated · ✗ not represented · ⚠ unverified / conflicting source

## Model S — https://www.tesla.com/models

| Feature | Source says | TeslHa |
|---|---|---|
| Body | Low fastback liftback, slim headlamps, front fenders above the hood, black glass roof | ◐ lofted body to published L/W/H/wheelbase, almond lamps, black roof band, liftback |
| Wheels | 19" or 21" | ◐ single wheel size from the dataset, turbine-style rim |
| Front screen | 17.4" first-row touchscreen | ✅ 17.4" landscape, floating above the dash |
| Rear screen | 9.4" second-row touchscreen | ✅ on the back of the centre console |
| Driver display | "Driver cluster display" | ✅ behind the steering control |
| Steering | Page photo shows a yoke | ✅ yoke · ⚠ a round wheel has also been offered |
| Seats | Second row seats three adults | ✅ 2 + 3 layout |
| Ambient light | Wrap-around lighting along dash and door trims | ✅ dash and door strips |
| Roof | All-glass roof | ✅ tinted glass visible from the cabin |
| Upholstery | Page photo: white seats with black bolsters | ◐ white/black material |
| Status | "No longer in production" (Signature Edition) | ✅ dataset status |

## Model X — https://www.tesla.com/modelx

| Feature | Source says | TeslHa |
|---|---|---|
| Body | Tall SUV, high blunt nose, large wheels, falcon-wing rear doors | ◐ raised nose, 760 mm tyres, falcon doors hinged near the roof centre |
| Wheels | 20" or 22" | ◐ single size |
| Screens | 17.4" front, 9.4" second row, driver cluster | ✅ |
| Seating | Spec table "Up to 6 seats"; copy says rows 2–3 seat five | ⚠ conflict · 2 + 2 + 2 layout shown |
| Steering | Not shown on the page | ⚠ round wheel used |
| Ambient light | Wrap-around lighting | ✅ |
| Status | "No longer in production" | ✅ |

## Model 3 — https://www.tesla.com/model3

| Feature | Source says | TeslHa |
|---|---|---|
| Body | Compact sedan, short deck, slim lamps | ◐ |
| Wheels | 18" or 19" | ◐ |
| Front screen | 16" centre touchscreen | ✅ |
| Driver display | Not listed | ✅ none |
| Steering | Heated round wheel, turn-signal stalk | ✅ round wheel · ✗ stalk not modelled |
| Rear display | Listed for Premium | ✅ shown (Premium only) · ⚠ size not published on the page |
| Seats | 5 | ✅ 2 + 3 |
| Dimensions | L 185.8", H 56.7", ground clearance 5.4" | ✅ dataset |

## Model Y — https://www.tesla.com/modely

| Feature | Source says | TeslHa |
|---|---|---|
| Body | Midsize SUV, sloped roofline, full-width rear light bar (photo) | ◐ raised nose, light bar |
| Wheels | 18" or 19" | ◐ |
| Front screen | 16" centre touchscreen | ✅ |
| Steering | Photo shows a round wheel | ✅ |
| Seats | 5 (Model Y L offers more; not modelled) | ✅ 2 + 3 |
| Rear display / ambient | Not stated for every trim | ⚠ shown |
| Dimensions | L 188.7", H 63.8", ground clearance 6.4" | ✅ dataset |

## Roadster, 1st generation (2008–2012)

Not documented on tesla.com. Two-seat layout from the dataset; the dials, console and trim are generic and flagged ⚠ in the cabin spec.

## Roadster, next generation — https://www.tesla.com/roadster

| Feature | Source says | TeslHa |
|---|---|---|
| Body | Angular wedge, hidden headlights, full-length taillight, thin-spoke wheels, active rear wing | ◐ faceted section (low superellipse exponents), slit headlamps, full-width tail lamp, thin rims · ✗ wing, fans and thrusters not modelled |
| Doors | Upward-opening (photo) | ◐ doors lift about the front edge |
| Seating | "Seating for two" (Performance, Thrust) | ✅ 2 seats (the 2017 reveal showed a 2+2) |
| Interior | Ultrawhite with gray microsuede bolsters | ✅ |
| Steering | Yoke for steer-by-wire | ✅ |
| Displays | Centre touchscreen plus two smaller forward displays | ✅ · ⚠ screen size not published (12" visual estimate) |
| Status | Reservations; specs are announcements | ✅ all figures tagged "announced target" |

## Known visual differences

- Bodies are lofted from about a dozen control points per curve. Panel gaps, bumper intakes, badges, door handles and lamp graphics are simplified.
- Each family uses one representative wheel size and one generation of styling.
- Seats are built from rounded primitives with stitching lines. They are not upholstery scans.
- Component placement (battery, motors and so on) is schematic. It is not a mechanical digital twin.
