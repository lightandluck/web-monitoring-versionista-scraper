'use strict';

// TODO: UUID assignment should happen independently of formatting
const uuid = require('../uuid.js');

/**
 * Converts scraped site data to CSV format.
 */
module.exports = function formatCsv (sites, options = {}) {
  const rows = [[
    'Index',
    'UUID',
    'Output Date/Time',
    'Agency',
    'Site Name',
    'Page name',
    'URL',
    'Page View URL',
    'Last Two - Side by Side',
    'Latest to Base - Side by Side',
    'Date Found - Latest',
    'Date Found - Base',
    'Diff Length',
    'Diff Hash',
    'versionista_account'
  ]];

  if (options.includeDiffs) {
    rows[0].push('Diff File');
  }
  if (options.includeContent) {
    rows[0].push('Version File');
  }

  // TODO: this would be better as a flatmap
  sites.forEach(site => {
    site.pages.forEach(page => {
      page.versions.forEach(version => {
        rows.push(rowForVersion(site, page, version, options));
      });
    });
  });

  return toCsvString(rows);
};

function rowForVersion (site, page, version, options) {
  const row = [
    null,
    uuid(),
    new Date().toISOString(),
    agencyForSite(site),
    site.name,
    page.title,
    page.url,
    page.versionistaUrl,
    version.diffWithPreviousUrl,
    version.diffWithFirstUrl,
    version.diffWithPreviousDate,
    version.diffWithFirstDate,
    version.diff && version.diff.length,
    version.diff && version.diff.hash,
    options.email
  ];

  if (options.includeDiffs) {
    if (version.diff) {
      row.push(options.outputFileName(version, 'diff'));
    }
    else {
      row.push('');
    }
  }

  if (options.includeContent) {
    if (version.hasContent) {
      row.push(options.outputFileName(version, 'content'));
    }
    else {
      row.push('');
    }
  }

  return row;
}

function agencyForSite (site) {
  return site.name.split('-')[0].trim();
}

// convert an array of rows to CSV data
function toCsvString (rows) {
  return rows
    .map(row => {
      return row
        .map(cell => {
          let result = '';
          if (cell != null) {
            result = cell.toString();
          }
          if (result.indexOf(',') > -1) {
            result = `"${result}"`;
          }
          return result;
        })
        .join(',');
    })
    .join('\n');
}