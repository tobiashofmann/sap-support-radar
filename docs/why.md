# Why SAP Support Radar?

SAP already provides official tooling to check the support/maintenance status of products in your own
landscape: **SAP Solution Manager** (System Landscape/LMDB) and **[SAP for Me](https://me.sap.com)**. SAP
Support Radar is not a replacement for either — it fills a narrower, more specific gap alongside them.

## What SAP's own tools give you — and what they assume

| Tool | What it's built for | What it assumes |
| --- | --- | --- |
| **SAP Solution Manager** | Full landscape/application lifecycle management (System Landscape, LMDB, change/release management) across an entire SAP system landscape. | A running, configured Solution Manager system; your systems registered in it; a Solution Manager user with the relevant authorizations. |
| **SAP for Me** | SAP's unified customer portal — contracts, incidents, licenses, and a system overview tied to your S-user and your organization's customer number. | A valid S-user with access rights tied to your organization's SAP contracts; scoped to what SAP has on record for that customer. |
| **SAP Support Radar** | One narrow question, answered as simply as possible: *which of the products I actually run are approaching end of support?* | A PAM CSV export (see [Installation](/#from-zero-to-a-running-app)) — nothing else. |

Both official tools are powerful, but that power comes with real weight: they're built for administering
an entire SAP landscape, not for a quick "what's about to expire" check, and both gate access behind SAP
system/contract authorizations that not everyone who needs this answer actually has.

## What SAP Support Radar adds

### 1. A simple, user-friendly, global overview

One table. Every product version from your PAM export, searchable, filterable by status/category/line, and
sortable by any maintenance date — see [App workflow & pages → Overview](/workflow#1-overview-main). Instead
of navigating Solution Manager's landscape management or SAP for Me's broader, contract-centric UI, you get
a single page built around exactly one question: *what's the status, and when does it change?* Row
highlighting (3 months to 3 years out) and a status-distribution chart make the "what needs attention soon"
view immediate, without constructing a query first.

### 2. Easy upkeep of products that aren't tracked in those tools at all

Not everything you run is a registered SAP system with a corresponding Solution Manager/LMDB entry or a
line item SAP for Me knows about — custom-built components, a product you're evaluating, or anything your
official landscape data simply hasn't caught up with yet. [Manage my
products](/workflow#2-manage-my-products-myproducts--build-your-own-landscape) lets you mark any PAM entry
as "yours," and [Create product](/workflow#3-create-product-myproductsadd) lets you add an entry by hand for
something that isn't in the PAM export at all — both in minutes, with no system registration step.

### 3. The same data, queryable by an AI

The bundled [MCP server](/mcp-server) exposes the identical PAM data as tools an LLM client can call
directly — see [ADR 0007](/adr/0007-mcp-server) for why this is a separate, independent server rather than
a feature bolted onto the app. In practice, that means an AI assistant reviewing an architecture document or
a technical/functional specification that names concrete SAP product versions can look up their support
status inline, as part of that review, instead of a human having to separately open a browser, search, and
cross-reference by hand. See [MCP server → Worked example](/mcp-server#worked-example) for an actual,
verified round trip.

### 4. No SAP system access or authorization required

SAP Support Radar is a static, client-only web app — see [ADR 0001](/adr/0001-client-only-no-backend). It
has no connection to any SAP system, requires no S-user, and needs no Solution Manager or SAP for Me
authorization to run. All it needs is a PAM CSV export, which per [ADR
0006](/adr/0006-user-supplied-pam-data) you supply yourself — once you have that export, the tool itself
imposes no further access gate.

### 5. Easy access for everyone who needs the answer

Solution Manager and SAP for Me access is typically scoped to SAP Basis/operations roles with system
authorizations or a customer-number-linked S-user. The question "is this product still supported" isn't
only relevant to that group, though — architects, consultants, and developers who are evaluating or
designing against a given SAP product version need the same answer, often without ever needing (or having)
SAP system access themselves. Since the app only needs a PAM export and runs entirely in the browser, anyone
who has that export — or access to a deployed instance, or the MCP server — can get the same answer.

## What this deliberately doesn't try to be

SAP Support Radar has no concept of your actual installed systems, no change/release management, no
incident handling, and no connection to your SAP contracts or licenses. If you need those, Solution Manager
and SAP for Me remain the right tools — SAP Support Radar's job starts and ends at "is this product version
still supported, and for how long," for whatever you've told it is yours.
