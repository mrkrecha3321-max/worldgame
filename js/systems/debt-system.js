/**
 * WorldForge: Nations - Sovereign Debt & Bonds Simulation System
 * Manages sovereign debt, coupon obligations, maturities and bond issuances in exact base units.
 */
(function () {
  'use strict';

  window.WorldForge = window.WorldForge || {};
  window.WorldForge.Systems = window.WorldForge.Systems || {};

  const DebtSystem = {
    calculateYield(country, maturityMonths = 120, isForeignCurrency = false) {
      const cbRate = country.centralBank.baseRate;
      const inflation = country.economy.inflation;
      const debtToGdp = country.debt.debtToGdp;

      let spread = 0.5;
      if (debtToGdp > 120) spread += 4.5;
      else if (debtToGdp > 90) spread += 2.5;
      else if (debtToGdp > 60) spread += 1.2;
      else if (debtToGdp > 40) spread += 0.5;
      else spread += 0.1;

      const years = maturityMonths / 12;
      const termPremium = Math.log10(Math.max(1, years)) * 0.75;
      const fxRisk = isForeignCurrency ? 0.8 : 0.0;

      const totalYield = cbRate * 0.7 + inflation * 0.3 + spread + termPremium + fxRisk + (country.debt.riskPremium || 0);
      return Math.max(0.25, Math.round(totalYield * 100) / 100);
    },

    issueBonds(country, amount, maturityMonths = 60, currency = 'USD', bondType = 'Standard', turn = 1) {
      const V = window.WorldForge.Core.Validators;
      const cleanAmount = V.clampNonNegative(amount);
      if (cleanAmount <= 0) return { success: false, reason: 'Kwota emisji musi być większa od 0' };

      const isForeign = (currency !== country.currency);
      const yieldRate = this.calculateYield(country, maturityMonths, isForeign);

      const bond = {
        id: `bond_${country.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: `${Math.round(maturityMonths / 12)}-Letnie Obligacje (${currency})`,
        principal: cleanAmount,
        yieldRate: yieldRate,
        maturityMonths: maturityMonths,
        totalDurationMonths: maturityMonths,
        currency: currency,
        investorGroup: isForeign ? 'Inwestorzy zagraniczni i fundusze hedgingowe' : 'Krajowy sektor bankowy i fundusze',
        isForeign: isForeign,
        issuedTurn: turn
      };

      if (!country.debt.bonds) country.debt.bonds = [];
      country.debt.bonds.push(bond);

      country.treasury += cleanAmount;
      country.debt.totalDebt += cleanAmount;
      country.debt.debtToGdp = (country.debt.totalDebt / Math.max(1, country.economy.gdpNominal)) * 100;

      window.WorldForge.Core.GameState.addNotification(
        'success',
        'Emisja Obligacji Skarbowych',
        `Pomyślnie wyemitowano obligacje skarbowe na kwotę ${window.WorldForge.Format.money(cleanAmount, currency)} z rentownością ${yieldRate.toFixed(2)}%.`,
        country.id
      );

      return { success: true, data: bond };
    },

    buybackBonds(country, bondId, amount = null) {
      const V = window.WorldForge.Core.Validators;
      const bondIndex = country.debt.bonds.findIndex(b => b.id === bondId);
      if (bondIndex === -1) return { success: false, reason: 'Nie znaleziono wybranej serii obligacji' };

      const bond = country.debt.bonds[bondIndex];
      const buyAmount = amount ? Math.min(bond.principal, V.clampNonNegative(amount)) : bond.principal;

      if (country.treasury < buyAmount) {
        return { success: false, reason: 'Niewystarczające środki w rezerwach skarbu państwa na wykup długu' };
      }

      country.treasury -= buyAmount;
      country.debt.totalDebt -= buyAmount;
      bond.principal -= buyAmount;

      if (bond.principal <= 1) {
        country.debt.bonds.splice(bondIndex, 1);
      }

      country.debt.debtToGdp = (country.debt.totalDebt / Math.max(1, country.economy.gdpNominal)) * 100;

      return { success: true, data: { boughtAmount: buyAmount, remainingPrincipal: bond.principal } };
    },

    refinanceBond(country, bondId, newMaturityMonths = 60, turn = 1) {
      const bondIndex = country.debt.bonds.findIndex(b => b.id === bondId);
      if (bondIndex === -1) return { success: false, reason: 'Nie znaleziono obligacji do refinansowania' };

      const bond = country.debt.bonds[bondIndex];
      const newYield = this.calculateYield(country, newMaturityMonths, bond.isForeign);

      bond.yieldRate = newYield;
      bond.maturityMonths = newMaturityMonths;
      bond.totalDurationMonths = newMaturityMonths;
      bond.issuedTurn = turn;

      return { success: true, data: bond };
    },

    processMonthly(state, turnNumber) {
      const V = window.WorldForge.Core.Validators;

      for (const [countryId, country] of Object.entries(state.countries)) {
        try {
          const debt = country.debt;
          const eco = country.economy;
          let totalMonthlyInterest = 0;

          if (!debt.bonds) debt.bonds = [];

          for (let i = debt.bonds.length - 1; i >= 0; i--) {
            const bond = debt.bonds[i];
            
            const monthlyCoupon = Math.round((bond.principal * (bond.yieldRate / 100)) / 12);
            totalMonthlyInterest += monthlyCoupon;

            bond.maturityMonths -= 1;

            if (bond.maturityMonths <= 0) {
              if (country.treasury >= bond.principal) {
                country.treasury -= bond.principal;
                debt.totalDebt -= bond.principal;
                debt.bonds.splice(i, 1);
                
                if (countryId === state.playerCountryId) {
                  window.WorldForge.Core.GameState.addNotification(
                    'info',
                    'Wykup Zapadających Obligacji',
                    `Zapadła seria ${bond.name}. Spłacono ${window.WorldForge.Format.money(bond.principal, bond.currency)} z rezerw skarbu.`,
                    countryId
                  );
                }
              } else {
                const rollYield = this.calculateYield(country, bond.totalDurationMonths || 60, bond.isForeign);
                bond.yieldRate = rollYield;
                bond.maturityMonths = bond.totalDurationMonths || 60;
                
                if (countryId === state.playerCountryId) {
                  window.WorldForge.Core.GameState.addNotification(
                    'warning',
                    'Rolowanie Długu Publicznego',
                    `Brak środków w skarbie na wykup ${bond.name}. Dokonano automatycznego rolowania (rentowność: ${rollYield.toFixed(2)}%).`,
                    countryId
                  );
                }
              }
            }
          }

          debt.monthlyInterestCost = totalMonthlyInterest;
          country.budget.spending.debtServicing = totalMonthlyInterest;

          let actualPrincipalSum = debt.bonds.reduce((acc, b) => acc + b.principal, 0);
          debt.totalDebt = V.clampNonNegative(actualPrincipalSum);
          debt.debtToGdp = V.sanitizeNumber((debt.totalDebt / Math.max(1, eco.gdpNominal)) * 100, 50, 0, 400);

          this.updateCreditRating(country);

          debt.historicalDebtToGdp.push(debt.debtToGdp);
          if (debt.historicalDebtToGdp.length > 36) debt.historicalDebtToGdp.shift();

        } catch (err) {
          console.error(`[DebtSystem] Error processing ${countryId}:`, err);
        }
      }
    },

    updateCreditRating(country) {
      const d = country.debt.debtToGdp;
      const bal = country.budget.balanceMonthly;
      let rating = 'BBB';

      if (d < 35 && bal >= 0) rating = 'AAA';
      else if (d < 50) rating = 'AA';
      else if (d < 65) rating = 'A';
      else if (d < 85) rating = 'BBB';
      else if (d < 110) rating = 'BB';
      else if (d < 140) rating = 'B';
      else rating = 'CCC';

      country.debt.creditRating = rating;
      country.economy.creditRating = rating;
    }
  };

  window.WorldForge.Systems.Debt = DebtSystem;
})();
