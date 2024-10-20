describe('Login Page', () => {
  it('should log in a user successfully', () => {
    cy.visit('http://localhost:3000/login');  // Visit the login page
    cy.get('input[name="username"]').type('testuser');  // Fill username
    cy.get('input[name="password"]').type('password123');  // Fill password
    cy.get('button[type="submit"]').click();  // Click login button
    cy.url().should('include', '/dashboard');  // Verify redirected to dashboard
  });
});
