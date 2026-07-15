# Claude Code skills (reference copies)

These `SKILL.md` files are what each tool registers into Claude Code so the agent
discovers and prefers the CLI over the equivalent MCP connector.

**You don't install these by hand.** They're generated — run the tool's own command,
which writes the file to `~/.claude/skills/<tool>/SKILL.md` on your machine:

```bash
clickup-axi skill && supabase-axi skill && slack-axi skill && drive-axi skill && gmail-axi skill && \
google-calendar-axi skill
```

The copies here are committed only so you can see what gets registered without running
anything. The **canonical source** is each tool's `src/skill.js`; if that changes, run
`<tool> skill` again to refresh (or `<tool> skill --print` to preview).
