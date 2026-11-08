// Estos casos usan los pacientes de db/seed.sql
describe('Pacientes: búsqueda', () => {
  beforeEach(() => cy.visit('/patients'));

  it('busca por parte del nombre', () => {
    cy.get('[data-testid=patient-search]').type('fern');
    cy.get('[data-testid=patient-row]').should('have.length', 1).and('contain', 'María Fernández');
  });

  it('busca por DNI', () => {
    cy.get('[data-testid=patient-search]').type('40123987');
    cy.get('[data-testid=patient-row]').should('have.length', 1).and('contain', 'Carlos Ramírez');
  });

  it('muestra un mensaje cuando no hay resultados', () => {
    cy.get('[data-testid=patient-search]').type('zzzz');
    cy.get('[data-testid=no-results]').should('be.visible');
  });

  it('registra un paciente nuevo y se puede encontrar', () => {
    const dni = String(Math.floor(10000000 + Math.random() * 89999999));
    cy.get('[data-testid=patient-name]').type('Paciente de Prueba');
    cy.get('[data-testid=patient-dni]').type(dni);
    cy.get('[data-testid=patient-birth]').type('1990-05-20');
    cy.get('[data-testid=patient-submit]').click();

    cy.get('[data-testid=patient-search]').type(dni);
    cy.get('[data-testid=patient-row]').should('have.length', 1).and('contain', 'Paciente de Prueba');
  });
});
