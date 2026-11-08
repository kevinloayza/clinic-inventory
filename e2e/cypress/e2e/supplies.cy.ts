describe('Insumos', () => {
  const unique = () => `Gasas ${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const fillForm = (name: string, stock: string, min: string) => {
    cy.get('[data-testid=supply-name]').type(name);
    cy.get('[data-testid=supply-unit]').type('paquetes');
    cy.get('[data-testid=supply-stock]').clear().type(stock);
    cy.get('[data-testid=supply-min]').clear().type(min);
    cy.get('[data-testid=supply-submit]').click();
  };

  it('crea un insumo y aparece en la tabla', () => {
    const name = unique();
    cy.visit('/');
    fillForm(name, '20', '5');
    cy.get(`[data-testid="supply-row-${name}"]`)
      .should('contain', 'paquetes')
      .and('contain', '20')
      .and('not.contain', 'Stock bajo');
  });

  it('marca "Stock bajo" cuando el stock no supera el mínimo', () => {
    const name = unique();
    cy.visit('/');
    fillForm(name, '2', '5');
    cy.get(`[data-testid="supply-row-${name}"]`).should('contain', 'Stock bajo');
  });

  it('muestra un error al repetir el nombre de un insumo', () => {
    const name = unique();
    cy.createSupply(name, 5);
    cy.visit('/');
    fillForm(name, '1', '0');
    cy.get('[data-testid=error]').should('contain', 'Ya existe un insumo');
  });
});
