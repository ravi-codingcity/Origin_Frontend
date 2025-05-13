import { useState, useEffect } from "react";



// Function that returns the container type options array
export const getContainerTypeOptions = () => {
  return [
    "20ft ST",
    "40ft ST",
    "40ft H.Q",
    "45ft H.Q",
    "20ft RF",
    "40ft RF",
    "40ft H.Q-RF",
    "20-OT-In",
    "40-OT-In",
  ];
};

// Function to fetch container type options from API if needed in the future
export const fetchContainerTypeOptions = async () => {
  // Simple implementation that can be expanded later when API is available
  return getContainerTypeOptions();
};

// React hook for consuming container type options in components
export const useContainerTypeOptions = () => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getOptions = async () => {
      try {
        const result = await fetchContainerTypeOptions();
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

export default getContainerTypeOptions;
