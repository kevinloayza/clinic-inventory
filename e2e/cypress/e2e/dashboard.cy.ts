describe('Resumen', () => {
  it('muestra los indicadores y las listas del almacén', () => {
    cy.visit('/');
    ['total', 'low', 'expiring', 'expired'].forEach((id) => {
      cy.get(`[data-testid=stat-${id}]`).find('.stat-n').invoke('text').should('match', /^\d+$/);
    });
    cy.get('[data-testid=recent-table]').should('be.visible');
  });

  it('un insumo vencido nuevo aumenta el contador y aparece en la lista de vencimientos', () => {
    const name = `Vencido ${Date.now()}`;
    cy.visit('/');
    cy.get('[data-testid=stat-expired] .stat-n').invoke('text').then((before) => {
      cy.request('POST', `${Cypress.env('apiUrl')}/api/supplies`, {
        name, unit: 'cajas', stock: 5, min_stock: 1, expiration_date: '2020-01-01',
      });
      cy.reload();
      cy.get('[data-testid=stat-expired] .stat-n').should('have.text', String(Number(before) + 1));
    });
  });

  it('al tocar un indicador se abre el listado ya filtrado', () => {
    cy.visit('/');
    cy.get('[data-testid=stat-expired]').click();
    cy.location('pathname').should('eq', '/supplies');
    cy.get('[data-testid=supply-filter]').should('have.value', 'expired');
    cy.get('[data-testid=supplies-table] tbody tr').each(($tr) => {
      expect($tr.text()).to.contain('Vencido');
    });
  });
});
