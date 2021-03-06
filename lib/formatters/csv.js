'use strict';

const crypto = require('crypto');
require('../polyfill');
// TODO: UUID assignment should happen independently of formatting
const uuid = require('../uuid.js');

const emptyHash = crypto.createHash('sha256').digest('hex');

module.exports = formatCsv;

/**
 * Converts scraped site data to CSV format.
 */
function formatCsv (sites, options = {}) {
  const versionType = options.versionType || 'versions';

  const rows = [];

  if (options.includeDiffs) {
    rows[0].push('Diff File');
    rows[0].push('Text Diff File');
  }
  if (options.includeContent) {
    rows[0].push('Version File');
    rows[0].push('Version Hash');
  }

  // TODO: this would be better as a flatmap
  sites.forEach(site => {
    site.pages && site.pages.forEach(page => {
      page[versionType] && page[versionType].forEach(version => {
        rows.push(rowForVersion(site, page, version, options));
      });
    });
  });

  return toCsvString([headers, ...(sortRows(rows))]);
};

const headers = [
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
  'Text Diff Length',
  'Text Diff Hash'
];

function rowForVersion (site, page, version, options) {
  const diff = version.diff || {};
  const textDiff = version.textDiff || {};

  const row = [
    '',
    uuid(),
    formatDate(new Date(), true),
    agencyForSite(site),
    site.name,
    page.title,
    page.url,
    page.versionistaUrl,
    version.diffWithPreviousSafeUrl || version.diffWithPreviousUrl || '[initial version]',
    version.diffWithFirstSafeUrl || version.diffWithFirstUrl || '[initial version]',
    formatDate(version.diffWithPreviousSafeDate || version.diffWithPreviousDate) || '[initial version]',
    formatDate(version.diffWithFirstSafeDate || version.diffWithFirstDate) || '[initial version]',
    diff.length,
    diff.hash !== emptyHash ? diff.hash : null,
    textDiff.length,
    textDiff.hash !== emptyHash ? textDiff.hash : null
  ];

  if (options.includeDiffs) {
    row.push(version.diff ? version.diff.path : '');
    row.push(version.textDiff ? version.textDiff.path : '');
  }

  if (options.includeContent) {
    if (version.hasContent) {
      row.push(version.filePath);
    }
    else {
      row.push('');
    }
    row.push(version.hash || '');
  }

  return row;
}

function digits (number, length = 2, includeSign = false) {
  let sign = includeSign ? '+' : '';
  if (number < 0) {
    sign = '-';
    number = Math.abs(number);
  }
  return sign + number.toString(10).padStart(length, '0');
}

function formatDate (date, includeTimezone) {
  if (!date) {
    return '';
  }

  // Similar to ISO 8601
  // YYYY-MM-DD HH:MM:SS tz
  if (includeTimezone) {
    const offset = date.getTimezoneOffset();
    // Note flipped sign
    const tzHours = digits(-Math.floor(offset / 60), 2, true);
    const tzMinutes = digits(Math.abs(offset % 60));
    const tzString = `${tzHours}${tzMinutes}`;

    return date.getFullYear() +
      '-' +
      digits(date.getMonth() + 1) +
      '-' +
      digits(date.getDate()) +
      ' ' +
      digits(date.getHours()) +
      ':' +
      digits(date.getMinutes()) +
      ':' +
      digits(date.getSeconds()) +
      ' ' +
      tzString;
  }
  else {
    return date.getUTCFullYear() +
      '-' +
      digits(date.getUTCMonth() + 1) +
      '-' +
      digits(date.getUTCDate()) +
      ' ' +
      digits(date.getUTCHours()) +
      ':' +
      digits(date.getUTCMinutes()) +
      ':' +
      digits(date.getUTCSeconds());
  }
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

function compareRows (a, b) {
  const a_text_hash = (a[15] || '').toLowerCase();
  const b_text_hash = (b[15] || '').toLowerCase();

  if (a_text_hash === b_text_hash) {
    const a_diff_hash = (a[13] || '').toLowerCase();
    const b_diff_hash = (b[13] || '').toLowerCase();

    if (a_diff_hash === b_diff_hash) {
      const a_time = new Date(a[10]);
      const b_time = new Date(b[10]);
      if (a_time === b_time) {
        return 0;
      }
      return a_time < b_time ? -1 : 1;
    }
    return a_diff_hash < b_diff_hash ? -1 : 1;
  }
  return a_text_hash < b_text_hash ? -1 : 1;
}

function updateIndexColumn (value, index) {
  value[0] = index + 1;
  return value;
}

function sortRows (rows) {
  return rows
    .sort(compareRows)
    .map(updateIndexColumn);
}

formatCsv.headers = headers;
formatCsv.formatDate = formatDate;
formatCsv.toCsvString = toCsvString;
formatCsv.sortRows = sortRows;

