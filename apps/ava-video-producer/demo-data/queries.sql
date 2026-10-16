-- Fictional Harborfield response. Replace each placeholder with the dataset
-- UUID shown in its Data Sources detail URL after importing the corresponding CSV.
-- Dataset display names are not SQL table names. Keep UUIDs double-quoted.
-- Use explicit AS aliases and qualified fields for multi-source QETL queries.

-- 1. Six-week trend. Missing values remain NULL in West Marsh's final weeks.
SELECT week_start, district_name, reported_cases, reporting_status
FROM "<weekly_reports_dataset_id>"
ORDER BY week_start, district_name;

-- 2. A short response list with the reasons visible (source data, not app workflow).
SELECT case_id, case_label, district_name, report_date, support_need, referral_status
FROM "<cases_dataset_id>"
WHERE referral_status = 'awaiting_contact'
ORDER BY report_date, case_id;

-- 3. Review coverage by district. COUNT DISTINCT prevents repeat visits from
-- inflating the number of cases with contact.
SELECT cases.district_name,
       COUNT(DISTINCT cases.case_id) AS recorded_cases,
       COUNT(DISTINCT visits.case_id) AS cases_with_contact
FROM "<cases_dataset_id>" AS cases
LEFT JOIN "<visits_dataset_id>" AS visits ON cases.case_id = visits.case_id
GROUP BY cases.district_name
ORDER BY recorded_cases DESC;

-- 4. An exact map binding retains coordinates plus inspectable source fields.
SELECT case_id, case_label, district_name, report_date, latitude, longitude,
       referral_status, support_need
FROM "<cases_dataset_id>"
WHERE district_id = 'D02';

-- 5. Prepared district summaries support polygon maps without a live join.
SELECT district_id, district_name, recorded_cases, awaiting_contact,
       supply_kits_available, latest_reporting_status, geometry
FROM "<districts_dataset_id>";
