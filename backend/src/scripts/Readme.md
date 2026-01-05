⚠️ SCRIPTS GUIDE

fetch/
- Fetches external data
- DOES NOT touch the database
- Safe to run anytime

seed/
- Inserts / updates database
- Idempotent but modifies data
- Run only after fetch scripts

maintenance/
- Cleanup & health scripts
- Use with caution

Recommended order:
1. fetch/*
2. seed/*
