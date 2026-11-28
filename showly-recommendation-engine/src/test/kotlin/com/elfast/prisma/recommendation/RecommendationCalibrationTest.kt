package com.elfast.prisma.recommendation

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class RecommendationCalibrationTest {

  @Test
  fun ratingsAreInterpretedRelativeToThePersonalBaseline() {
    assertEquals(-0.1, ratingSignal(7, 8.5), 0.000001)
    assertTrue(ratingSignal(7, 8.5) < 0.0)
    assertTrue(ratingSignal(10, 8.5) > 0.0)
    assertTrue(ratingSignal(4, 2.5) > ratingSignal(3, 2.5))
  }

  @Test
  fun theSameRatingMeansDifferentThingsForDifferentRatingHabits() {
    val strictRater = ratingSignal(7, 8.5)
    val generousRater = ratingSignal(7, 5.5)
    assertTrue(strictRater < generousRater)
  }

  @Test
  fun ratingSignalRejectsInvalidInputs() {
    try {
      ratingSignal(11, 6.0)
      throw AssertionError("An invalid rating must be rejected")
    } catch (_: IllegalArgumentException) {
      // Expected.
    }
    try {
      ratingSignal(7, Double.NaN)
      throw AssertionError("An invalid personal mean must be rejected")
    } catch (_: IllegalArgumentException) {
      // Expected.
    }
  }
}
