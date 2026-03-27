const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

// Only log in development mode to reduce production overhead
if (import.meta.env.DEV) {
  reportWebVitals(console.log);
} else {
  // In production, you can send metrics to an analytics service
  // reportWebVitals(analyticsSubmit);
}

export default reportWebVitals;
