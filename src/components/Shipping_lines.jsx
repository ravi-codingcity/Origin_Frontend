import { useState, useEffect } from "react";

// Function that returns the Shipping Lines options array
export const getShippingLinesOptions = () => {
  return [
    "Allcargo Logistics",
    "Antong Holdings",
    "Arkas Line",
    "ANL",
    "Bahri",
    "Balaji Shipping",
    "CMA CGM",
    "COSCO",
    "Econ Line",
    "Emirates Shipping",
    "Evergreen",
    "FESCO LINE",
    "Gold Star Line",
    "Goodrich Maritime",
    "HMM",
    "Hapag-Lloyd",
    "IRISL",
    "INOX",
    "KMTC",
    "Maersk",
    "Maxicon Shipping Agencies",
    "MSC",
    "NAVIS",
    "NAVIO",
    "ONE",
    "OOCL",
    "PIL",
    "SCI",
    "SITC Container",
    "SM Line",
    "Samudera Shipping",
    "Sarjak Container Lines",
    "SeaLead Shipping",
    "Sealand",
    "Shreyas",
    "Sinokor Merchant",
    "TASS",
    "TGLS",
    "Trans Asia",
    "TLPL",
    "TS Lines",
    "Transworld Group",
    "UAFL",
    "Unifeeder",
    "UNITED LINER",
    "WINWIN Lines",
    "Wan Hai",
    "X-Press Feeders",
    "Yang Ming",
    "ZIM",
  ];
};

// Function to fetch Shipping Lines options from API if needed in the future
export const fetchShippingLinesOptions = async () => {
  try {
    // This function can be expanded later to fetch from an API
    // For now, returning the static list
    return getShippingLinesOptions();
  } catch (error) {
    console.error("Error fetching Shipping Lines options:", error);
    return getShippingLinesOptions(); // Fallback to static list
  }
};

// React hook for consuming Shipping Lines options in components
export const useShippingLinesOptions = () => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getOptions = async () => {
      try {
        const result = await fetchShippingLinesOptions();
        setOptions(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getOptions();
  }, []);

  return { options, loading, error };
};

export default getShippingLinesOptions;
