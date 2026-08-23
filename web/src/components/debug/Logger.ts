export const addLog = (msg: string) => { 
  const evt = new CustomEvent('DEBUG_LOG', { detail: msg }); 
  window.dispatchEvent(evt); 
};
