# condo-configure

Drag-and-drop furniture planner for an 810 sq ft condo (bedroom, living/dining, kitchen, lofted den, balcony), drawn to scale in inches.

- **Inventory tray**: every piece you've entered, with optional photo, size, status (in condo / moving in / considering) and an "estimated" flag. Add pieces by hand or start from a catalog of common sizes.
- **Plan**: drag cards onto the plan; pieces snap to a 3" grid and to walls/other furniture (hold Alt to move freely). Press R or use the handle to rotate. Red = overlapping a wall, built-in or another piece; amber = front clearance blocked.
- **Layouts**: keep several named layouts of the same inventory. Undo/redo, tape measure, PNG export, JSON backup/restore.

Everything is saved in your browser (localStorage). Use **Menu → Back up** to move data between browsers.

## Develop

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # static site in dist/
npm run lint
```

Floor-plan geometry lives in `src/lib/floorplan.ts` (traced from `public/reference/floor-plan.png`); seeded furniture is in `src/lib/seed.ts`.
