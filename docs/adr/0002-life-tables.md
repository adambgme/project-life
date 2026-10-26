# 2. Life expectancy from one ONS table per nation, sex and variant

Date: 26 Oct 2026 · Status: accepted (T3, #5)

**Source.** ONS 2024-based past and projected period and cohort life tables (released 15 May 2026): mortality rates
(qx) for the UK and each nation; male and female; principal, high and low variants. Open Government Licence v3.0.

**One table, by calendar year and age.** ONS cohort tables are the diagonals of its period tables (born b, age a →
year b + a), but they only exist for births from 1981, and the period tables stop in 2074. So the pipeline keeps the
period table from 2024 and extends it past 2074 along ONS's own cohort diagonals, checking that the two sheets agree
wherever they overlap (a cheap test that both were read correctly). Anyone alive today can then be followed to 100:
- **cohort** (default): the rate for age a is read in the year you'll be that age;
- **period**: this year's rates at every age (the headline figure).

**Not the National life tables (yet).** The ticket listed the observed 2022–2024 National life tables. Period figures
here come from the same projection files instead, so cohort and period share one source and edition. The observed
history belongs with the Explore page (T8).

**Beyond 100.** ONS tables stop at 100. After that, rates keep rising at their 99→100 pace. This reproduces ONS's
published life expectancy at 100 (e.g. 1.69 years for men in 2026) to within 0.02 years; holding the rate flat would
overstate it by about 0.2.

**Accuracy checks.** Unit tests compare the model against ONS's published expectation of life and survivors tables:
within 0.05 years for life expectancy (at birth, at 36, 41, 80 and 100, cohort and period), and within 0.2 percentage
points for the chance of reaching 80, 90 and 95. Note that ONS's cohort ex sheets are indexed by calendar year, but its
cohort lx sheets by year of birth.

**Size.** Rates are stored to 4 significant figures (under 0.05% change) as integers, each year as a difference from
the year before: about 50 kB gzipped per nation. The UK file ships with the page; the others load on demand from the
site itself.

**Grid length.** The default is the age by which only about 1 in 10 people like you are still alive, rounded up to a
multiple of 5, so the statistics overlay (T4) has room to fade. The page states the chance of reaching the grid's end
in words, and the person can set any length from 40 to 120.
