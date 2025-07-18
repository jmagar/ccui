import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display the main heading and navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check main heading
    await expect(page.getByRole('heading', { name: /claude code web ui/i })).toBeVisible();
    
    // Check description
    await expect(page.getByText(/comprehensive web-based frontend/i)).toBeVisible();
    
    // Check call-to-action buttons
    await expect(page.getByRole('link', { name: /start chatting/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /view dashboard/i })).toBeVisible();
  });

  test('should navigate to chat page', async ({ page }) => {
    await page.goto('/');
    
    // Click the "Start Chatting" button
    await page.getByRole('link', { name: /start chatting/i }).click();
    
    // Should navigate to chat page
    await expect(page).toHaveURL('/chat');
  });

  test('should navigate to dashboard page', async ({ page }) => {
    await page.goto('/');
    
    // Click the "View Dashboard" button
    await page.getByRole('link', { name: /view dashboard/i }).click();
    
    // Should navigate to dashboard page
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display feature cards', async ({ page }) => {
    await page.goto('/');
    
    // Check that all three feature cards are visible
    await expect(page.getByText('Real-time Chat')).toBeVisible();
    await expect(page.getByText('Session Management')).toBeVisible();
    await expect(page.getByText('MCP Integration')).toBeVisible();
    
    // Check feature descriptions
    await expect(page.getByText(/websocket-based streaming responses/i)).toBeVisible();
    await expect(page.getByText(/persistent sessions with cross-device access/i)).toBeVisible();
    await expect(page.getByText(/oauth 2.1 support/i)).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check that content is still visible and properly laid out
    await expect(page.getByRole('heading', { name: /claude code web ui/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /start chatting/i })).toBeVisible();
    
    // Feature cards should stack vertically on mobile
    const featureCards = page.locator('div:has-text("Real-time Chat")').first();
    await expect(featureCards).toBeVisible();
  });
});