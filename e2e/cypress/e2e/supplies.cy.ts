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
    cy.visit('/supplies');
    fillForm(name, '20', '5');
    cy.get(`[data-testid="supply-row-${name}"]`)
      .should('contain', 'paquetes')
      .and('contain', '20')
      .and('not.contain', 'Stock bajo');
  });

  it('marca "Stock bajo" cuando el stock no supera el mínimo', () => {
    const name = unique();
    cy.visit('/supplies');
    fillForm(name, '2', '5');
    cy.get(`[data-testid="supply-row-${name}"]`).should('contain', 'Stock bajo');
  });

  it('registra un insumo con fecha de vencimiento y marca "Vencido"', () => {
    const name = unique();
    cy.visit('/supplies');
    cy.get('[data-testid=supply-expiry]').type('2020-01-31');
    fillForm(name, '10', '1');
    cy.get(`[data-testid="supply-row-${name}"]`)
      .find('[data-testid=expiry-cell]')
      .should('contain', '31/01/2020')
      .and('contain', 'Vencido');
  });

  it('un insumo con vencimiento lejano no muestra alertas', () => {
    const name = unique();
    cy.visit('/supplies');
    cy.get('[data-testid=supply-expiry]').type('2099-12-31');
    fillForm(name, '10', '1');
    cy.get(`[data-testid="supply-row-${name}"]`)
      .find('[data-testid=expiry-cell]')
      .should('contain', '31/12/2099')
      .and('not.contain', 'Vencido')
      .and('not.contain', 'Por vencer');
  });

  it('busca insumos por nombre', () => {
    const tag = `Busqueda${Date.now()}`;
    cy.createSupply(`${tag} Alfa`, 5);
    cy.createSupply(`${tag} Beta`, 5);
    cy.visit('/supplies');
    cy.get('[data-testid=supply-search]').type(tag);
    cy.get('[data-testid=supplies-table] tbody tr').should('have.length', 2);
    cy.get('[data-testid=supply-search]').clear().type(`${tag} Beta`);
    cy.get('[data-testid=supplies-table] tbody tr').should('have.length', 1).and('contain', 'Beta');
  });

  it('filtra por estado y avisa cuando nada coincide', () => {
    cy.visit('/supplies');
    cy.get('[data-testid=supply-filter]').select('expired');
    cy.get('[data-testid=supplies-table] tbody tr').each(($tr) => {
      expect($tr.text()).to.contain('Vencido');
    });
    cy.get('[data-testid=supply-search]').type('zzzz-no-existe');
    cy.get('[data-testid=supplies-empty]').should('contain', 'No hay insumos que coincidan');
  });

  it('edita el stock mínimo de un insumo', () => {
    const name = unique();
    cy.createSupply(name, 5, 1);
    cy.visit('/supplies');
    cy.get('[data-testid=supply-search]').type(name);
    cy.get(`[data-testid="supply-row-${name}"]`).find('[data-testid=supply-edit]').click();
    cy.get('[data-testid=supply-min]').clear().type('50');
    cy.get('[data-testid=supply-submit]').click();
    cy.get(`[data-testid="supply-row-${name}"]`).should('contain', 'Stock bajo');
  });

  it('elimina un insumo', () => {
    const name = unique();
    cy.createSupply(name, 5);
    cy.visit('/supplies');
    cy.get('[data-testid=supply-search]').type(name);
    cy.get(`[data-testid="supply-row-${name}"]`).find('[data-testid=supply-delete]').click();
    cy.get('[data-testid=supplies-empty]').should('be.visible');
  });

  it('exporta el inventario a CSV', () => {
    const name = unique();
    cy.createSupply(name, 7);
    cy.visit('/supplies');
    cy.get('[data-testid=supply-search]').type(name);
    cy.get(`[data-testid="supply-row-${name}"]`).should('exist');
    cy.get('[data-testid=supply-export]').click();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    cy.readFile(`${Cypress.config('downloadsFolder')}/insumos-${today}.csv`).should('contain', name).and('contain', 'Stock mínimo');
  });

  it('muestra un error al repetir el nombre de un insumo', () => {
    const name = unique();
    cy.createSupply(name, 5);
    cy.visit('/supplies');
    fillForm(name, '1', '0');
    cy.get('[data-testid=error]').should('contain', 'Ya existe un insumo');
  });
});
