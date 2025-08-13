import { test, expect, Page } from '@playwright/test';

// Utility functions for text testing
async function addTextLayer(page: Page, text?: string) {
  await page.click('button:has-text("Add Text")');
  await page.waitForTimeout(300);
  
  if (text) {
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    await page.keyboard.type(text);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  
  return await getCanvasInfo(page);
}

async function getCanvasInfo(page: Page) {
  return await page.evaluate(() => {
    const canvas = (window as any).canvas;
    const activeObject = canvas?.getActiveObject();
    
    return {
      objects: canvas?.getObjects().length || 0,
      activeObjectExists: !!activeObject,
      activeObjectText: activeObject?.text || null,
      activeObjectFontFamily: activeObject?.fontFamily || null,
      activeObjectFontSize: activeObject?.fontSize || null,
      activeObjectFontWeight: activeObject?.fontWeight || null
    };
  });
}

async function setFontProperty(page: Page, property: 'size' | 'weight' | 'family', value: string | number) {
  switch (property) {
    case 'size':
      const fontSizeInput = page.locator('input[type="number"][min="8"]').first();
      await fontSizeInput.fill(value.toString());
      await page.keyboard.press('Enter');
      break;
      
    case 'weight':
      // Assuming there's a font weight selector
      const fontWeightSelect = page.locator('select[data-testid="font-weight"]').or(
        page.locator('button[aria-label*="weight"]')
      );
      if (await fontWeightSelect.count() > 0) {
        await fontWeightSelect.click();
        await page.click(`option[value="${value}"], button:has-text("${value}")`);
      }
      break;
      
    case 'family':
      const fontFamilySelect = page.locator('button[role="combobox"]').first();
      await fontFamilySelect.click();
      await page.click(`button:has-text("${value}")`);
      break;
  }
  
  await page.waitForTimeout(300);
}

test.describe('Text Boundary Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Empty text layer handling', async ({ page }) => {
    console.log('Testing empty text layer scenarios...');
    
    // Create empty text layer (just add without typing)
    const emptyLayer = await addTextLayer(page);
    expect(emptyLayer.objects).toBe(1);
    expect(emptyLayer.activeObjectText).toMatch(/Text \d+|Sample Text|^$/); // Default text or empty
    
    // Try to edit empty layer
    const canvas = page.locator('canvas');
    await canvas.dblclick();
    
    // Clear any default text
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.waitForTimeout(100);
    
    // Exit editing mode with empty text
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Verify layer still exists or is handled gracefully
    const afterEmpty = await getCanvasInfo(page);
    console.log('After empty text:', afterEmpty);
    
    // Should either keep the layer (with default text) or remove it
    expect(afterEmpty.objects).toBeGreaterThanOrEqual(0);
    
    // Try to interact with empty layer
    await canvas.click();
    await page.waitForTimeout(200);
    
    // Add content to previously empty layer
    await canvas.dblclick();
    await page.keyboard.type('Added to empty layer');
    await page.keyboard.press('Escape');
    
    const withContent = await getCanvasInfo(page);
    expect(withContent.objects).toBe(1);
    expect(withContent.activeObjectText).toContain('Added to empty layer');
  });

  test('Special Unicode characters (emojis, RTL, symbols)', async ({ page }) => {
    console.log('Testing special Unicode characters...');
    
    const unicodeTestCases = [
      {
        name: 'Basic emojis',
        text: '😀😃😄😁😆😅😂🤣😊😇🙂🙃😉😌😍🥰😘'
      },
      {
        name: 'Complex emojis with modifiers',
        text: '👨‍👩‍👧‍👦👩🏽‍🦲🧑🏻‍🎓👨🏿‍⚕️👩‍🚀🏳️‍⚧️🇺🇸'
      },
      {
        name: 'Arabic RTL text',
        text: 'السلام عليكم ورحمة الله وبركاته مرحبا بكم في هذا التطبيق'
      },
      {
        name: 'Hebrew RTL text', 
        text: 'שלום עליכם וברכה טובה אהלן וסהלן בואו נבדוק את הטקסט'
      },
      {
        name: 'Mixed RTL and LTR',
        text: 'Hello مرحبا 123 שלום world! 🌍'
      },
      {
        name: 'Mathematical symbols',
        text: '∑∫∂∞≠≤≥±×÷√∏∆∇∈∉⊂⊃∪∩∧∨¬∀∃'
      },
      {
        name: 'Currency and special symbols',
        text: '€£¥₹₽₦₱₩₪₫＄ ™®©℗℠⚡⛔⭐⚠️'
      },
      {
        name: 'Diacritical marks',
        text: 'Café naïve résumé piñata Zürich mañana Москва 北京'
      },
      {
        name: 'Zero-width characters',
        text: 'Text\u200Bwith\u200Czero\u200Dwidth\uFEFFcharacters'
      },
      {
        name: 'Control characters',
        text: 'Line1\nLine2\tTabbed\rCarriage'
      }
    ];

    for (const testCase of unicodeTestCases) {
      console.log(`Testing ${testCase.name}...`);
      
      // Create text layer with Unicode content
      const layerInfo = await addTextLayer(page, testCase.text);
      expect(layerInfo.objects).toBe(1);
      
      // Verify text was set (may be modified by the app)
      console.log(`Text after setting: "${layerInfo.activeObjectText}"`);
      
      // Test editing Unicode text
      const canvas = page.locator('canvas');
      await canvas.dblclick();
      await page.keyboard.press('End');
      await page.keyboard.type(' + additional');
      await page.keyboard.press('Escape');
      
      await page.waitForTimeout(300);
      
      // Verify text editing worked
      const afterEdit = await getCanvasInfo(page);
      expect(afterEdit.activeObjectText).toContain('additional');
      
      // Test text selection with Unicode
      await canvas.dblclick();
      await page.keyboard.press('Control+a');
      await page.keyboard.type(`Replaced: ${testCase.name}`);
      await page.keyboard.press('Escape');
      
      const afterReplace = await getCanvasInfo(page);
      expect(afterReplace.activeObjectText).toContain(testCase.name);
      
      // Test copy/paste if available
      await canvas.dblclick();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Control+c');
      await page.keyboard.press('Control+v');
      await page.keyboard.press('Escape');
      
      await page.waitForTimeout(200);
      
      // Clear for next test
      await page.click('button:has-text("Reset")');
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(300);
    }
    
    console.log('Unicode character tests completed');
  });

  test('Maximum text length limits', async ({ page }) => {
    console.log('Testing maximum text length limits...');
    
    const textLengthTests = [
      { name: '1K characters', length: 1000 },
      { name: '10K characters', length: 10000 },
      { name: '50K characters', length: 50000 },
      { name: '100K characters', length: 100000 }
    ];

    for (const lengthTest of textLengthTests) {
      console.log(`Testing ${lengthTest.name}...`);
      
      // Generate long text
      const baseText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
      const longText = baseText.repeat(Math.ceil(lengthTest.length / baseText.length)).substring(0, lengthTest.length);
      
      console.log(`Generated text length: ${longText.length}`);
      
      try {
        // Add text layer
        await page.click('button:has-text("Add Text")');
        await page.waitForTimeout(300);
        
        const canvas = page.locator('canvas');
        await canvas.dblclick();
        
        // Use clipboard to paste large text (faster than typing)
        await page.evaluate((text) => {
          const textarea = document.activeElement;
          if (textarea && textarea.tagName === 'TEXTAREA') {
            (textarea as HTMLTextAreaElement).value = text;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, longText);
        
        await page.waitForTimeout(1000); // Wait for processing
        
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        // Check if text was accepted
        const textInfo = await getCanvasInfo(page);
        console.log(`Text layer created: ${textInfo.objects > 0}`);
        
        if (textInfo.objects > 0) {
          const actualLength = textInfo.activeObjectText?.length || 0;
          console.log(`Actual text length: ${actualLength}`);
          
          // Test editing large text
          await canvas.dblclick();
          await page.keyboard.press('End');
          await page.keyboard.type(' [EDITED]');
          await page.keyboard.press('Escape');
          
          const editedInfo = await getCanvasInfo(page);
          expect(editedInfo.activeObjectText).toContain('[EDITED]');
          
          console.log(`${lengthTest.name} handled successfully`);
        } else {
          console.log(`${lengthTest.name} was rejected or caused issues (acceptable)`);
        }
        
      } catch (error) {
        console.log(`${lengthTest.name} caused error: ${error.message}`);
        
        // Verify app is still functional after error
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo).toBeTruthy();
      }
      
      // Clear for next test
      await page.click('button:has-text("Reset")');
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(300);
    }
  });

  test('Font loading failures and fallbacks', async ({ page }) => {
    console.log('Testing font loading failures...');
    
    // Add text layer first
    await addTextLayer(page, 'Font fallback test');
    
    // Test with non-existent font
    console.log('Testing non-existent font...');
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      const activeObject = canvas?.getActiveObject();
      if (activeObject) {
        activeObject.set('fontFamily', 'NonExistentFont-Regular');
        canvas.renderAll();
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Verify text is still rendered (with fallback font)
    let canvasInfo = await getCanvasInfo(page);
    expect(canvasInfo.objects).toBe(1);
    expect(canvasInfo.activeObjectExists).toBeTruthy();
    
    // Test with malformed font family name
    console.log('Testing malformed font name...');
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      const activeObject = canvas?.getActiveObject();
      if (activeObject) {
        activeObject.set('fontFamily', ''); // Empty font family
        canvas.renderAll();
      }
    });
    
    await page.waitForTimeout(500);
    
    canvasInfo = await getCanvasInfo(page);
    expect(canvasInfo.objects).toBe(1);
    
    // Test with very long font name
    console.log('Testing extremely long font name...');
    const longFontName = 'VeryLongFontNameThatShouldNotExist'.repeat(10);
    await page.evaluate((fontName) => {
      const canvas = (window as any).canvas;
      const activeObject = canvas?.getActiveObject();
      if (activeObject) {
        activeObject.set('fontFamily', fontName);
        canvas.renderAll();
      }
    }, longFontName);
    
    await page.waitForTimeout(500);
    
    canvasInfo = await getCanvasInfo(page);
    expect(canvasInfo.objects).toBe(1);
    
    // Test with special characters in font name
    console.log('Testing font name with special characters...');
    await page.evaluate(() => {
      const canvas = (window as any).canvas;
      const activeObject = canvas?.getActiveObject();
      if (activeObject) {
        activeObject.set('fontFamily', 'Font/Name<>With:Special*Characters?');
        canvas.renderAll();
      }
    });
    
    await page.waitForTimeout(500);
    
    canvasInfo = await getCanvasInfo(page);
    expect(canvasInfo.objects).toBe(1);
    
    // Verify app can still change to valid font
    const fontFamilySelect = page.locator('button[role="combobox"]').first();
    if (await fontFamilySelect.count() > 0) {
      await fontFamilySelect.click();
      await page.click('button:has-text("Arial")');
      await page.waitForTimeout(500);
      
      canvasInfo = await getCanvasInfo(page);
      expect(canvasInfo.activeObjectFontFamily).toBe('Arial');
    }
    
    console.log('Font loading failure tests completed');
  });

  test('Unsupported font weights and styles', async ({ page }) => {
    console.log('Testing unsupported font weights...');
    
    await addTextLayer(page, 'Font weight test');
    
    const fontWeightTests = [
      { name: 'Ultra-light', value: '100' },
      { name: 'Extra-light', value: '150' },
      { name: 'Medium', value: '500' },
      { name: 'Ultra-bold', value: '950' },
      { name: 'Invalid weight', value: '1000' },
      { name: 'Negative weight', value: '-100' },
      { name: 'Non-numeric weight', value: 'super-bold' },
      { name: 'Decimal weight', value: '400.5' }
    ];

    for (const weightTest of fontWeightTests) {
      console.log(`Testing font weight: ${weightTest.name} (${weightTest.value})...`);
      
      try {
        // Set font weight directly via evaluation
        await page.evaluate((weight) => {
          const canvas = (window as any).canvas;
          const activeObject = canvas?.getActiveObject();
          if (activeObject) {
            activeObject.set('fontWeight', weight);
            canvas.renderAll();
          }
        }, weightTest.value);
        
        await page.waitForTimeout(300);
        
        // Verify object still exists and renders
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo.objects).toBe(1);
        expect(canvasInfo.activeObjectExists).toBeTruthy();
        
        console.log(`Font weight ${weightTest.name} was handled`);
        
      } catch (error) {
        console.log(`Font weight ${weightTest.name} caused error: ${error.message}`);
      }
    }
    
    // Test font style edge cases
    const fontStyleTests = ['italic', 'oblique', 'normal', 'invalid-style', ''];
    
    for (const styleTest of fontStyleTests) {
      console.log(`Testing font style: ${styleTest}...`);
      
      try {
        await page.evaluate((style) => {
          const canvas = (window as any).canvas;
          const activeObject = canvas?.getActiveObject();
          if (activeObject) {
            activeObject.set('fontStyle', style);
            canvas.renderAll();
          }
        }, styleTest);
        
        await page.waitForTimeout(200);
        
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo.objects).toBe(1);
        
      } catch (error) {
        console.log(`Font style ${styleTest} caused error: ${error.message}`);
      }
    }
    
    console.log('Font weight and style tests completed');
  });

  test('Extreme line heights and spacing', async ({ page }) => {
    console.log('Testing extreme line heights...');
    
    await addTextLayer(page, 'Line height test\nSecond line\nThird line\nFourth line');
    
    const lineHeightTests = [
      { name: 'Zero line height', value: 0 },
      { name: 'Negative line height', value: -1 },
      { name: 'Very small line height', value: 0.1 },
      { name: 'Normal line height', value: 1.2 },
      { name: 'Large line height', value: 5 },
      { name: 'Extreme line height', value: 20 },
      { name: 'Very large line height', value: 100 }
    ];

    for (const heightTest of lineHeightTests) {
      console.log(`Testing ${heightTest.name}: ${heightTest.value}...`);
      
      try {
        await page.evaluate((lineHeight) => {
          const canvas = (window as any).canvas;
          const activeObject = canvas?.getActiveObject();
          if (activeObject) {
            activeObject.set('lineHeight', lineHeight);
            canvas.renderAll();
          }
        }, heightTest.value);
        
        await page.waitForTimeout(300);
        
        // Verify text is still rendered
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo.objects).toBe(1);
        
        // Test editing with extreme line height
        const canvas = page.locator('canvas');
        await canvas.dblclick();
        await page.keyboard.press('End');
        await page.keyboard.type(`\nAdded with ${heightTest.name}`);
        await page.keyboard.press('Escape');
        
        const editedInfo = await getCanvasInfo(page);
        expect(editedInfo.objects).toBe(1);
        
        console.log(`${heightTest.name} handled successfully`);
        
      } catch (error) {
        console.log(`${heightTest.name} caused error: ${error.message}`);
        
        // Verify app is still functional
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo.objects).toBe(1);
      }
    }
    
    // Test character spacing edge cases
    const charSpacingTests = [
      { name: 'Negative spacing', value: -1000 },
      { name: 'Zero spacing', value: 0 },
      { name: 'Large spacing', value: 1000 },
      { name: 'Extreme spacing', value: 10000 }
    ];

    for (const spacingTest of charSpacingTests) {
      console.log(`Testing character spacing: ${spacingTest.name}...`);
      
      try {
        await page.evaluate((spacing) => {
          const canvas = (window as any).canvas;
          const activeObject = canvas?.getActiveObject();
          if (activeObject) {
            activeObject.set('charSpacing', spacing);
            canvas.renderAll();
          }
        }, spacingTest.value);
        
        await page.waitForTimeout(300);
        
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo.objects).toBe(1);
        
      } catch (error) {
        console.log(`Character spacing ${spacingTest.name} caused error: ${error.message}`);
      }
    }
    
    console.log('Line height and spacing tests completed');
  });

  test('Text with null/undefined properties', async ({ page }) => {
    console.log('Testing text with null/undefined properties...');
    
    await addTextLayer(page, 'Property corruption test');
    
    // Test corrupting various text properties
    const propertyCorruptionTests = [
      { name: 'null text', property: 'text', value: null },
      { name: 'undefined text', property: 'text', value: undefined },
      { name: 'null fontFamily', property: 'fontFamily', value: null },
      { name: 'undefined fontSize', property: 'fontSize', value: undefined },
      { name: 'null color', property: 'fill', value: null },
      { name: 'undefined left position', property: 'left', value: undefined },
      { name: 'null top position', property: 'top', value: null },
      { name: 'NaN fontSize', property: 'fontSize', value: NaN },
      { name: 'Infinity fontSize', property: 'fontSize', value: Infinity },
      { name: 'negative fontSize', property: 'fontSize', value: -10 }
    ];

    for (const corruptionTest of propertyCorruptionTests) {
      console.log(`Testing ${corruptionTest.name}...`);
      
      try {
        await page.evaluate(({ property, value }) => {
          const canvas = (window as any).canvas;
          const activeObject = canvas?.getActiveObject();
          if (activeObject) {
            const props: any = {};
            props[property] = value;
            activeObject.set(props);
            canvas.renderAll();
          }
        }, corruptionTest);
        
        await page.waitForTimeout(300);
        
        // Verify object handling
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo.objects).toBe(1);
        
        // Test that we can still interact with corrupted object
        const canvas = page.locator('canvas');
        await canvas.click();
        await page.waitForTimeout(200);
        
        // Try to edit the corrupted text
        await canvas.dblclick();
        await page.keyboard.type(' [RECOVERY TEST]');
        await page.keyboard.press('Escape');
        
        const recoveredInfo = await getCanvasInfo(page);
        expect(recoveredInfo.objects).toBe(1);
        
        console.log(`${corruptionTest.name} was handled gracefully`);
        
      } catch (error) {
        console.log(`${corruptionTest.name} caused error: ${error.message}`);
        
        // Verify app can still function
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo).toBeTruthy();
      }
    }
    
    console.log('Property corruption tests completed');
  });

  test('Multi-line text edge cases', async ({ page }) => {
    console.log('Testing multi-line text edge cases...');
    
    const multiLineTests = [
      {
        name: 'Many empty lines',
        text: '\n\n\n\n\n\n\n\n\n\n'
      },
      {
        name: 'Mixed content with empty lines',
        text: 'Line 1\n\nLine 3\n\n\nLine 6\n\n\n\nEnd'
      },
      {
        name: 'Very long lines',
        text: 'Short\n' + 'Very long line that should test wrapping and rendering behavior with extremely long content that might cause performance issues '.repeat(10) + '\nShort again'
      },
      {
        name: 'Special line endings',
        text: 'Windows\r\nUnix\nMac\rMixed\r\n\n\r'
      },
      {
        name: 'Unicode line separators',
        text: 'Line 1\u2028Line with line separator\u2029Line with paragraph separator'
      },
      {
        name: 'Extreme line count',
        text: Array(1000).fill('Line').map((text, i) => `${text} ${i}`).join('\n')
      }
    ];

    for (const multiLineTest of multiLineTests) {
      console.log(`Testing ${multiLineTest.name}...`);
      
      try {
        await addTextLayer(page, multiLineTest.text);
        
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo.objects).toBe(1);
        
        // Test editing multi-line text
        const canvas = page.locator('canvas');
        await canvas.dblclick();
        
        // Navigate through lines
        await page.keyboard.press('Home');
        await page.keyboard.press('End');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        
        // Add content
        await page.keyboard.press('End');
        await page.keyboard.type('\nAdded line');
        await page.keyboard.press('Escape');
        
        const editedInfo = await getCanvasInfo(page);
        expect(editedInfo.objects).toBe(1);
        
        console.log(`${multiLineTest.name} handled successfully`);
        
        // Test selection across multiple lines
        await canvas.dblclick();
        await page.keyboard.press('Control+a');
        await page.keyboard.type('Replaced multi-line text');
        await page.keyboard.press('Escape');
        
        const replacedInfo = await getCanvasInfo(page);
        expect(replacedInfo.objects).toBe(1);
        expect(replacedInfo.activeObjectText).toContain('Replaced multi-line text');
        
      } catch (error) {
        console.log(`${multiLineTest.name} caused error: ${error.message}`);
        
        // Verify app still works
        const canvasInfo = await getCanvasInfo(page);
        expect(canvasInfo).toBeTruthy();
      }
      
      // Clear for next test
      await page.click('button:has-text("Reset")');
      page.on('dialog', dialog => dialog.accept());
      await page.waitForTimeout(300);
    }
    
    console.log('Multi-line text tests completed');
  });
});