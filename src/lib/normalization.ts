export const getEventId = (obj: any): string | null => {
  if (!obj) return null;
  // Normalize based on common keys seen in the codebase
  return obj.id || 
         obj.negocio_id || 
         obj.treinamento_id || 
         obj.hubspot_id || 
         obj.negocioID || 
         obj.treinamentoID || 
         obj.hubspotID || 
         (typeof obj === 'string' ? obj : null);
};

export const getEventName = (obj: any): string => {
  if (!obj) return 'Evento';
  return obj.nomeNegocio || 
         obj.nome_negocio || 
         obj.nome || 
         obj.nomeEvento || 
         'Evento';
};
