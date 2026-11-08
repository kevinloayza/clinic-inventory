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

  it('rechaza una salida mayor al stock disponible', () => {
    cy.get('[data-testid=mov-type]').select('out');
    cy.get('[data-testid=mov-qty]').clear().type('999');
    cy.get('[data-testid=mov-submit]').click();

    cy.get('[data-testid=error]').should('contain', 'Stock insuficiente');
    cy.get('[data-testid=success]').should('not.exist');
  });
});
