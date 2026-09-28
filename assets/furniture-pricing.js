// Existing Housecall Pro catalog, verified September 27, 2026. No price changes.
export function furniturePrice(text) {
  text = text.replace(/\b(?:no|not|without|exclude)\s+(?:the\s+|a\s+|any\s+)?(?:recliners?|sofas?|couch(?:es)?|love\s?seats?|(?:accent |dining )?chairs?|sectionals?)\b/g, '');
  const unmatched = text.match(/\b(?:ottomans?|benches|bench|pianos?|futons?)\b/g);
  if (unmatched) return `I do not have a verified catalog price for ${[...new Set(unmatched)].join(' and ')}. Please have a person review the full furniture list before choosing a package; I have not priced the complete request.`;
  const sofa = /\b(?:sofas?|couch(?:es)?)\b/.test(text);
  const loveseat = /\blove\s?seats?\b/.test(text);
  const recliner = /\brecliners?\b|accent chairs?/.test(text);
  const chair = /\bchairs?\b/.test(text);
  const sectional = /\bsectionals?\b/.test(text);
  const namedPackage = /complete seating/.test(text);
  const pluralPieces = /\b(?:sofas|couches|love\s?seats|chairs|recliners|sectionals)\b/.test(text);
  const repeatedPieces = [ /\b(?:sofas?|couch(?:es)?)\b/g, /\blove\s?seats?\b/g, /\brecliners?\b/g, /\bchairs?\b/g ].some(pattern => (text.match(pattern) || []).length > 1);
  const countedMultiple = /\b(?:\d{2,}|[2-9]|two|three|four|five|six|seven|eight|nine|ten|several|multiple)\s+(?:(?:standard|accent|dining|upholstered|small|large)\s+)*(?:sofas?|couches|love\s?seats?|chairs?|recliners?|sectionals?)\b/.test(text);
  const additionalChair = /\brecliners?\b/.test(text) && chair || /accent chairs?/.test(text) && /dining chairs?/.test(text);
  const limits = ' Specialty fabrics, heavy staining, or oversized pieces may require review.';
  const singleQuantities = !countedMultiple && !pluralPieces && !repeatedPieces && !/\b(?:extra|another|additional)\b/.test(text);
  const oneSet = singleQuantities && !sectional && !additionalChair;
  if (oneSet && (sofa && loveseat && (recliner || chair) || namedPackage && !sofa && !loveseat && !chair && !recliner)) {
    return 'The Complete Seating Package is $179 plus tax for one standard sofa, one loveseat, and one chair or recliner during the same visit.' + limits;
  }
  const items = [];
  if (namedPackage) items.push('Complete Seating Package (one standard sofa, one loveseat, and one chair or recliner): $179');
  if (sofa && loveseat && singleQuantities && !namedPackage) items.push('one standard sofa and one loveseat together: $149');
  else {
    if (sofa) items.push('each standard sofa: $89');
    if (loveseat) items.push('each standard loveseat: $79');
  }
  if (recliner) items.push('each standard recliner or upholstered accent chair: $39');
  if (chair && /dining/.test(text)) items.push('each standard fabric dining chair: $19');
  else if (chair && (!recliner || additionalChair)) items.push('each fabric dining chair: $19; each upholstered accent chair: $39');
  const smallSectional = /\bsmall\s+sectionals?\b|\bsectionals?\s+(?:is\s+)?small\b/.test(text);
  const largeSectional = /\b(?:large|big)\s+sectionals?\b|\bsectionals?\s+(?:is\s+)?(?:large|big)\b|\b(?:six|seven|eight|[6-8])[- ](?:seat|seated section|section)s?\s+sectionals?\b/.test(text);
  if (sectional) items.push(largeSectional && !smallSectional
    ? 'each large sectional, typically 6 to 8 seated sections: $169'
    : smallSectional && !largeSectional ? 'each small sectional, typically up to 5 seated sections: $119'
      : 'each small sectional (typically up to 5 seated sections): $119; each large sectional (typically 6 to 8 seated sections): $169');
  if (!items.length) return 'Furniture is priced by the piece. View the Furniture Cleaning category in our booking catalog for the matching service and scope.';
  return `Furniture cleaning, plus applicable tax: ${items.join('; ')}.${!oneSet || items.length > 1 ? ' These are item prices, not a confirmed combined total. Select each required service in the catalog or contact the company to check the full scope.' : ''}${limits}`;
}
