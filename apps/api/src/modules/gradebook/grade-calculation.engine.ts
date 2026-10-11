import {
  GradeSourceType,
  MissingWorkPolicy,
  type IGradeCategoryConfig,
  type IGradeItemScore,
  type ICategoryGradeContribution,
  type IGradeScaleItem,
  type IGradeOverride,
} from '@eta/types';
import { DEFAULT_GRADE_SCALE } from './gradebook-config.model.js';

export interface StudentCategoryItemsInput {
  categoryId: string;
  items: IGradeItemScore[];
}

export interface CalculationInput {
  categories: IGradeCategoryConfig[];
  categoryItemsMap: Map<string, IGradeItemScore[]>;
  passingPercentage: number;
  gradeScale?: IGradeScaleItem[];
  override?: IGradeOverride;
}

export interface CalculationOutput {
  categoryContributions: ICategoryGradeContribution[];
  calculatedPercentage: number;
  finalPercentage: number;
  letterGrade: string;
  gpa: number;
  isPassed: boolean;
}

export class GradeCalculationEngine {
  /**
   * Round to 2 decimal places deterministically.
   */
  public static round2(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  /**
   * Map a percentage to letter grade using grade scale.
   */
  public static deriveLetterGrade(
    percentage: number,
    gradeScale: IGradeScaleItem[] = DEFAULT_GRADE_SCALE
  ): string {
    const sorted = [...gradeScale].sort((a, b) => b.minPercentage - a.minPercentage);
    for (const item of sorted) {
      if (percentage >= item.minPercentage) {
        return item.letter;
      }
    }
    return sorted[sorted.length - 1]?.letter || 'F';
  }

  /**
   * Map a percentage to GPA using grade scale.
   */
  public static deriveGpa(
    percentage: number,
    gradeScale: IGradeScaleItem[] = DEFAULT_GRADE_SCALE
  ): number {
    const sorted = [...gradeScale].sort((a, b) => b.minPercentage - a.minPercentage);
    for (const item of sorted) {
      if (percentage >= item.minPercentage) {
        return item.gpa;
      }
    }
    return sorted[sorted.length - 1]?.gpa || 0.0;
  }

  /**
   * Calculate grade for a student given categories, items, and policies.
   */
  public static calculate(input: CalculationInput): CalculationOutput {
    const {
      categories,
      categoryItemsMap,
      passingPercentage,
      gradeScale = DEFAULT_GRADE_SCALE,
      override,
    } = input;

    const categoryContributions: ICategoryGradeContribution[] = [];
    let calculatedPercentage = 0;

    for (const category of categories) {
      const items = categoryItemsMap.get(category.id) || [];

      // Process drop lowest policy if configured
      let processedItems = items.map((item) => ({ ...item }));
      const dropCount = category.dropLowestCount || 0;

      if (dropCount > 0 && processedItems.length > dropCount) {
        // Only drop among eligible non-excused items
        const nonExcusedIndices = processedItems
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => !item.isExcused)
          .sort((a, b) => a.item.normalizedPercentage - b.item.normalizedPercentage);

        const indicesToDrop = new Set(
          nonExcusedIndices.slice(0, dropCount).map((entry) => entry.index)
        );

        processedItems = processedItems.map((item, index) => {
          if (indicesToDrop.has(index)) {
            return { ...item, isDropped: true };
          }
          return item;
        });
      }

      // Sum raw scores and maximum marks for active items
      let rawScoreTotal = 0;
      let rawMaxTotal = 0;

      for (const item of processedItems) {
        if (item.isDropped || item.isExcused) {
          continue;
        }

        if (item.isMissing) {
          if (category.missingWorkPolicy === MissingWorkPolicy.EXCLUDE) {
            // Exclude from both numerator and denominator
            continue;
          }
          // Default: treat as ZERO (adds to maxMarks, 0 obtained)
          rawMaxTotal += item.maxMarks;
          continue;
        }

        rawScoreTotal += item.obtainedMarks;
        rawMaxTotal += item.maxMarks;
      }

      let categoryPercentage = 0;
      if (rawMaxTotal > 0) {
        categoryPercentage = this.round2((rawScoreTotal / rawMaxTotal) * 100);
      }

      const weightedContribution = this.round2(
        (categoryPercentage * category.weight) / 100
      );

      calculatedPercentage += weightedContribution;

      categoryContributions.push({
        categoryId: category.id,
        categoryName: category.name,
        sourceType: category.sourceType,
        weight: category.weight,
        rawScoreTotal: this.round2(rawScoreTotal),
        rawMaxTotal: this.round2(rawMaxTotal),
        categoryPercentage,
        weightedContribution,
        itemScores: processedItems,
      });
    }

    calculatedPercentage = this.round2(calculatedPercentage);

    // Apply override if active
    let finalPercentage = calculatedPercentage;
    let letterGrade = this.deriveLetterGrade(calculatedPercentage, gradeScale);
    let gpa = this.deriveGpa(calculatedPercentage, gradeScale);

    if (override && override.isOverridden && override.overrideContribution !== undefined) {
      finalPercentage = this.round2(override.overrideContribution);
      letterGrade =
        override.overrideLetterGrade || this.deriveLetterGrade(finalPercentage, gradeScale);
      gpa =
        override.overrideGpa !== undefined
          ? override.overrideGpa
          : this.deriveGpa(finalPercentage, gradeScale);
    }

    const isPassed = finalPercentage >= passingPercentage;

    return {
      categoryContributions,
      calculatedPercentage,
      finalPercentage,
      letterGrade,
      gpa,
      isPassed,
    };
  }
}
