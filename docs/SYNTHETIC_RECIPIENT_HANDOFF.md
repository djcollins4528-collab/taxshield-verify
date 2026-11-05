# Synthetic recipient handoff acceptance

On November 5, 2026, the approved staging collector issued one synthetic finding
summary to the approved staging reviewer. The two accounts belong to the same owner.
The reviewer retrieved the package through the deployed HTTPS API. The receiver
compared all 369 bytes with the local fixture and independently computed the SHA-256
digest `cfd34e8c3deda597e4b110bff2f8828bb59c9d3bae35d1dd227089fee6749587`.

The issuer withdrew the grant 1.55 seconds after issuing it, inside its ten-minute
validity window. The same recipient token then received HTTP 403 for the package
and HTTP 200 from the Auth user endpoint. A fresh recipient sign-in also received
403. The anonymous caller and collector could not retrieve the package. Direct
private-object requests returned errors both before and after withdrawal. A repeat
withdrawal succeeded, and an attempt to reissue the withdrawn grant returned 409.

The function fixes the issuer, recipient, tenant, package and allowed operations.
It verifies the caller through Auth and checks the live session and active membership
on every request. The package contains a synthetic finding result and two synthetic
event references. A separate private withdrawal marker takes precedence on reads.
The client receives the bytes directly with no-store headers. Withdrawal governs
future downloads. Recipients can retain bytes already downloaded.

Post-run database inspection found one retained package, one withdrawal marker,
a private bucket, zero Auth sessions and all assessment drafts locked.
The committed JSON receipt lists the observed HTTP results. No customer data or
credentials are included. This single-use exercise intentionally ends in the
withdrawn state. Preserve the marker and package as evidence.

The broader paid-pilot delivery gate still requires an authorized engagement,
independent review, and an approved customer package. Live intake and billing
require separate owner authorization.
