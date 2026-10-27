# 3. Other countries from UN WPP, deprivation from ONS

Date: 27 Oct 2026 · Status: accepted (T10, #12)

**Other countries: UN World Population Prospects 2024.** Complete (single-age) life tables, medium variant, 2024–2100,
for 237 countries and areas. Licence confirmed on 27 Oct 2026 as CC BY 3.0 IGO (stated in the WPP 2024 publications and
data); the page and README credit "United Nations, Department of Economic and Social Affairs, Population Division (2024).
World Population Prospects 2024". WHO data stays out (non-commercial, share-alike).

**Same model, second source.** Each country becomes one file in the nations' encoding (qx by year and age, 4
significant figures, year differences), so ADR 0002's model runs on it unchanged, cohort and period alike. Differences
from the ONS tables:
- one projection only: the high and low variants decode as the medium one, so no band is drawn;
- WPP's last group is an open 100+ (qx = 1), so the tables stop at 99 and the rates continue from the 98→99 pace (ONS:
  from 99→100). The effect on averages is a few hundredths of a year.

ADR 0002's accuracy checks don't apply to UN figures. Instead, a unit test holds the UN's UK within 1.5 years (period)
and 2.5 years (cohort) of ONS's, and the build fails if any country's life expectancy at birth leaves 35–100 in any year,
or the file has far fewer than 237 countries.

**Like with like.** UN and ONS figures for the UK differ slightly, so the comparison sets the chosen country beside the
UN's UK, never beside ONS's. It is labelled "country of residence", not nationality. Both the curve and a table are
shown.

**Loading.** The files total about 18 MB (16 kB gzipped each), so they are not bundled or precached: each is fetched from
the site itself (`public/data/countries/`) when someone picks it, then cached by the service worker for offline use.

**Deprivation: ONS healthy life expectancy by national area deprivation (2022 to 2024, released 15 April 2026).**
England is in tenths of the IMD 2025 and Wales in fifths of the WIMD, as ONS publishes them; Scotland and Northern
Ireland have their own indices that ONS doesn't cover, so they see England's figures and are told so. These are
abridged period tables by 5-year age band, so the page shows the band your age falls in, from its first age, and says
so. Healthy life expectancy and 95% intervals come from the same file; intervals are shown for one sex only, because
they can't be averaged. A person's own tenth is an optional pick that isn't saved; the app never asks for a postcode.
