# Sources and adaptations

This English self-study course is an original teaching adaptation. It uses synthetic
PulseBridge records, not clinical data. The starting artifact was the locally
available practical-01.zip supplied with this project. Its 20-line log and both
configuration fixtures are preserved byte for byte. Its core restaurant analogy,
shell/kernel distinction, safe-copy approach and incident-analysis scenario are
retained and expanded, rather than presented as newly sourced facts.

## Verified older course material
The project contains Orhan Konak's **02_Einfuehrung_OS.pdf**. PDF pages 8–12 describe
OS structure, kernel responsibilities and restaurant analogies; pages 55–58 cover
kernel, user mode, system calls and interfaces. Chapter 1 adapts those concepts in
English. The diagram and wording here are newly written; no slide image is copied.
The older page 10 wording can conflate kernel code with a system process; this
handbook explicitly separates a system call into the kernel from a user-space
service. Shell and GUI are user interfaces, not required intermediaries for every
application-to-kernel interaction. The source PDF is not redistributed on this site.

## Unavailable sources — no invented attribution
The starting ZIP's teaching.md claims a source named
**01_Betriebssysteme_Linux_Kommandos.pdf** and an automatically generated transcript
named **Du musst es endlich lernen - YouTube**, including page and timestamp mappings.
Neither original is available in this workspace. The referenced chat returns content
placeholders for its assistant answers, not the missing attachments. Consequently,
those detailed mappings have not been independently verified and are not cited as
evidence. No verified tutorial URL or channel was supplied. The optional tutorial
cannot be incorporated faithfully until its actual transcript or link is supplied.

## Newly added for this revision
The explicit 90-minute route, chapter scaffolding, self-check hints, whoami,
completion/history practice, sort/uniq/cut example, optional editor/network/script
labs, Codespaces lifecycle guide, checks, deployment workflow and separation of
private instructor materials were newly authored for this revision. No tutorial
content was fabricated to fill missing sources.

## Infrastructure references
- [Codespaces overview](https://docs.github.com/en/codespaces/overview)
- [Stopping and starting](https://docs.github.com/en/codespaces/developing-in-a-codespace/stopping-and-starting-a-codespace)
- [Billing](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces)
- [Custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [MkDocs configuration](https://www.mkdocs.org/user-guide/configuration/)

The live repository API and main-branch ZIP returned 404 during this revision;
the public site could not be fetched. This may reflect availability or access
restrictions; it does not establish that the repository is absent. This release
is based on the supplied ZIP, not an asserted synchronisation with GitHub.
