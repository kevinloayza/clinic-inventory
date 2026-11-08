/** Crea un insumo directamente por la API (prepara datos sin pasar por la interfaz). */
Cypress.Commands.add('createSupply', (name: string, stock: number, min_stock = 0) =>
  cy
    .request('POST', `${Cypress.env('apiUrl')}/api/supplies`, { name, unit: 'cajas', stock, min_stock })
    .its('body'),
);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      createSupply(name: string, stock: number, min_stock?: number): Chainable<{ id: number; name: string; stock: number }>;
    }
  }
}
export {};
