describe('Movimientos', () => {
  let supply: { id: number; name: string };

  beforeEach(() => {
    cy.createSupply(`Jeringas ${Date.now()}-${Math.floor(Math.random() * 1000)}`, 10).then((s) => {
      supply = s;
      cy.visit('/movements');
      cy.get('[data-testid=mov-supply]').select(String(s.id));
    });
  });

  it('registra una salida y actualiza el stock', () => {
    cy.get('[data-testid=mov-type]').select('out');
    cy.get('[data-testid=mov-qty]').clear().type('3');
    cy.get('[data-testid=mov-submit]').click();

    cy.get('[data-testid=success]').should('contain', 'Stock actual: 7');
    cy.get('[data-testid=movements-table]').should('contain', supply.name).and('contain', 'Salida');
  });

  it('registra una entrada y suma al stock', () => {
    cy.get('[data-testid=mov-type]').select('in');
    cy.get('[data-testid=mov-qty]').clear().type('5');
    cy.get('[data-testid=mov-submit]').click();

    cy.get('[data-testid=success]').should('contain', 'Stock actual: 15');
  });

  it('entrega insumos a un paciente y queda en el historial', () => {
    cy.get('[data-testid=mov-type]').select('out');
    cy.get('[data-testid=mov-qty]').clear().type('2');
    cy.get('[data-testid=mov-patient]').contains('option', 'María Fernández').then(($o) => {
      cy.get('[data-testid=mov-patient]').select($o.val() as string);
    });
    cy.get('[data-testid=mov-submit]').click();

    cy.get('[data-testid=success]').should('contain', 'Stock actual: 8');
    cy.get('[data-testid=movements-table] tbody tr').first().should('contain', supply.name).and('contain', 'María Fernández');
  });

  it('las entradas no piden paciente', () => {
    cy.get('[data-testid=mov-type]').select('in');
    cy.get('[data-testid=mov-patient]').should('not.exist');
  });

  it('filtra el historial por insumo y por tipo', () => {
    cy.get('[data-testid=mov-type]').select('in');
    cy.get('[data-testid=mov-qty]').clear().type('4');
    cy.get('[data-testid=mov-submit]').click();
    cy.get('[data-testid=success]').should('be.visible');

    cy.get('[data-testid=mov-filter-supply]').select(String(supply.id));
    cy.get('[data-testid=movements-table] tbody tr').should('have.length', 1).and('contain', 'Entrada');
    cy.get('[data-testid=mov-filter-type]').select('out');
    cy.contains('No hay movimientos con esos filtros').should('be.visible');
  });

  it('rechaza una salida mayor al stock disponible', () => {
    cy.get('[data-testid=mov-type]').select('out');
    cy.get('[data-testid=mov-qty]').clear().type('999');
    cy.get('[data-testid=mov-submit]').click();

    cy.get('[data-testid=error]').should('contain', 'Stock insuficiente');
    cy.get('[data-testid=success]').should('not.exist');
  });
});
